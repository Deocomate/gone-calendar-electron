import { describe, expect, it } from 'vitest'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { DateTime, Settings } from 'luxon'
import {
  clampHour,
  dropRangeFromPointer,
  hourFromPointer,
  minutesFromPointer,
  sameDropTarget,
  shiftOccurrenceByDrop,
  timedRangeForAllDayDrop,
  ALL_DAY_TO_TIMED_MINUTES,
  resolveDropRange,
  grabOffsetMinutes,
  singleDayRange,
  dropNeedsMoveOrCopyChoice
} from '../src/renderer/src/dnd/drop-target'
import MonthView from '../src/renderer/src/views/MonthView'

describe('calendar drop target helpers', () => {
  it('treats identical date/hour pairs as the same target', () => {
    expect(sameDropTarget(null, null)).toBe(true)
    expect(sameDropTarget({ dateKey: '2026-08-18' }, { dateKey: '2026-08-18' })).toBe(true)
    expect(
      sameDropTarget({ dateKey: '2026-08-18', hour: 9 }, { dateKey: '2026-08-18', hour: 9 })
    ).toBe(true)
  })

  it('treats missing hour and a different hour as different targets', () => {
    expect(sameDropTarget({ dateKey: '2026-08-18' }, { dateKey: '2026-08-18', hour: 0 })).toBe(false)
    expect(sameDropTarget({ dateKey: '2026-08-18', hour: 8 }, { dateKey: '2026-08-18', hour: 9 })).toBe(
      false
    )
    expect(
      sameDropTarget(
        { dateKey: '2026-08-18', minutes: 15 },
        { dateKey: '2026-08-18', minutes: 30 }
      )
    ).toBe(false)
    expect(sameDropTarget({ dateKey: '2026-08-18' }, { dateKey: '2026-08-19' })).toBe(false)
  })

  it('clamps pointer hours into the visible day grid', () => {
    expect(clampHour(-4)).toBe(0)
    expect(clampHour(9.8)).toBe(9)
    expect(clampHour(30)).toBe(23)
    expect(hourFromPointer(120, 0, 60)).toBe(2)
    expect(hourFromPointer(-20, 0, 60)).toBe(0)
  })

  it('snaps pointer position to 15-minute marks instead of whole hours', () => {
    expect(minutesFromPointer(0, 0, 56)).toBe(0)
    expect(minutesFromPointer(56, 0, 56)).toBe(60)
    expect(minutesFromPointer(14, 0, 56)).toBe(15)
    expect(minutesFromPointer(28, 0, 56)).toBe(30)
    expect(minutesFromPointer(42, 0, 56)).toBe(45)
  })

  it('places a dropped event using the pointer minute and grab offset', () => {
    const day = DateTime.local(2026, 8, 19)
    const { start, end } = dropRangeFromPointer({
      targetDate: day,
      pointerMinutes: 10 * 60 + 30,
      durationMinutes: 60,
      grabOffsetMinutes: 30
    })
    expect(start.toFormat('HH:mm')).toBe('10:00')
    expect(end.toFormat('HH:mm')).toBe('11:00')
  })

  it('shifts a two-day clock-window event without collapsing it to one hour', () => {
    const origStart = DateTime.local(2026, 8, 18, 10, 0)
    const origEnd = DateTime.local(2026, 8, 19, 11, 0)
    const { start, end } = shiftOccurrenceByDrop({
      origStart,
      origEnd,
      segmentStart: origStart,
      targetDate: DateTime.local(2026, 8, 20),
      pointerMinutes: 14 * 60 + 30,
      grabOffsetMinutes: 0
    })
    expect(start.toFormat('yyyy-MM-dd HH:mm')).toBe('2026-08-20 14:30')
    expect(end.toFormat('yyyy-MM-dd HH:mm')).toBe('2026-08-21 15:30')
  })

  it('keeps the span when the second-day slice is dropped', () => {
    const origStart = DateTime.local(2026, 8, 18, 10, 0)
    const origEnd = DateTime.local(2026, 8, 19, 11, 0)
    const { start, end } = shiftOccurrenceByDrop({
      origStart,
      origEnd,
      segmentStart: DateTime.local(2026, 8, 19, 10, 0),
      targetDate: DateTime.local(2026, 8, 21),
      pointerMinutes: 10 * 60,
      grabOffsetMinutes: 0
    })
    expect(start.toFormat('yyyy-MM-dd HH:mm')).toBe('2026-08-20 10:00')
    expect(end.toFormat('yyyy-MM-dd HH:mm')).toBe('2026-08-21 11:00')
  })
})

describe('MonthView drop highlight', () => {
  it('marks the hovered drop cell without relying on classList mutations', () => {
    const html = renderToString(
      React.createElement(MonthView, {
        anchorDate: DateTime.fromISO('2026-08-18'),
        occurrences: [],
        showLunar: false,
        showWeekNumbers: false,
        dropTarget: { dateKey: '2026-08-18' }
      })
    )

    expect(html).toContain('gc-cell')
    expect(html).toContain('is-drop-target')
  })
})

describe('dropping an all-day event onto the hourly grid', () => {
  const targetDate = DateTime.fromISO('2026-09-20T00:00:00', { zone: 'utc' })

  /**
   * Regression. An all-day pill is a ~20px bar whose stored span is a full 24
   * hours. Routing it through shiftOccurrenceByDrop read a mid-pill grab as a
   * 12-hour grab offset, so a drop aimed at 14:00 landed at 02:00 - and the
   * result kept the 24-hour span instead of becoming an hour block.
   */
  it('starts exactly where the pointer was, with no grab offset applied', () => {
    const { start } = timedRangeForAllDayDrop({ targetDate, pointerMinutes: 14 * 60 })

    expect(start.toFormat('HH:mm')).toBe('14:00')
    expect(start.toISODate()).toBe('2026-09-20')
  })

  it('becomes an hour long rather than keeping the all-day span', () => {
    const { start, end } = timedRangeForAllDayDrop({ targetDate, pointerMinutes: 14 * 60 })

    expect(end.diff(start, 'minutes').minutes).toBe(ALL_DAY_TO_TIMED_MINUTES)
    expect(ALL_DAY_TO_TIMED_MINUTES).toBe(60)
  })

  it('snaps to the same 15-minute grid as every other timed drop', () => {
    const { start } = timedRangeForAllDayDrop({ targetDate, pointerMinutes: 9 * 60 + 7 })
    expect(start.toFormat('HH:mm')).toBe('09:00')

    const later = timedRangeForAllDayDrop({ targetDate, pointerMinutes: 9 * 60 + 8 })
    expect(later.start.toFormat('HH:mm')).toBe('09:15')
  })

  it('handles a drop at the very top and very bottom of the grid', () => {
    expect(timedRangeForAllDayDrop({ targetDate, pointerMinutes: 0 }).start.toFormat('HH:mm')).toBe(
      '00:00'
    )

    const late = timedRangeForAllDayDrop({ targetDate, pointerMinutes: 23 * 60 + 45 })
    expect(late.start.toFormat('HH:mm')).toBe('23:45')
    // Spilling into the next day is correct - the grid ends, the event need not.
    expect(late.end.toISODate()).toBe('2026-09-21')
  })

  it('accepts an explicit duration when a caller wants one', () => {
    const { start, end } = timedRangeForAllDayDrop({
      targetDate,
      pointerMinutes: 10 * 60,
      durationMinutes: 30
    })
    expect(end.diff(start, 'minutes').minutes).toBe(30)
  })

  it('lands where the old shift maths did not', () => {
    // The exact failure: a 1-day all-day event (00:00 -> 23:59:59.999) grabbed in
    // the middle of its pill and dropped at 14:00.
    const origStart = targetDate.startOf('day')
    const origEnd = origStart.endOf('day')
    const shifted = shiftOccurrenceByDrop({
      origStart,
      origEnd,
      segmentStart: origStart,
      targetDate,
      pointerMinutes: 14 * 60,
      grabOffsetMinutes: 720 // what grabOffsetMinutes() returns for a mid-pill grab
    })
    expect(shifted.start.toFormat('HH:mm')).toBe('02:00')
    expect(Math.round(shifted.end.diff(shifted.start, 'hours').hours)).toBe(24)

    const placed = timedRangeForAllDayDrop({ targetDate, pointerMinutes: 14 * 60 })
    expect(placed.start.toFormat('HH:mm')).toBe('14:00')
    expect(placed.end.diff(placed.start, 'hours').hours).toBe(1)
  })
})

describe('resolveDropRange', () => {
  const targetDate = DateTime.fromISO('2026-09-20T00:00:00', { zone: 'utc' })
  const allDayStart = DateTime.fromISO('2026-09-13T00:00:00', { zone: 'utc' })
  const allDayEnd = allDayStart.endOf('day')

  it('places an all-day event at the pointer when it lands on the hourly grid', () => {
    const { start, end } = resolveDropRange({
      allDay: true,
      origStart: allDayStart,
      origEnd: allDayEnd,
      segmentStart: allDayStart,
      targetDate,
      targetMinutes: 14 * 60,
      // A grab offset is still measured by the caller; for an all-day drag it
      // must be ignored, which is the half of the bug that moved the drop.
      grabOffsetMinutes: 720
    })

    expect(start.toFormat('HH:mm')).toBe('14:00')
    expect(end.diff(start, 'hours').hours).toBe(1)
  })

  it('still shifts a timed event by the drag delta, span intact', () => {
    // An overnight event must not collapse to its duration on the target day.
    const origStart = DateTime.fromISO('2026-09-13T22:00:00', { zone: 'utc' })
    const origEnd = DateTime.fromISO('2026-09-14T06:00:00', { zone: 'utc' })

    const { start, end } = resolveDropRange({
      allDay: false,
      origStart,
      origEnd,
      segmentStart: origStart,
      targetDate,
      targetMinutes: 20 * 60,
      grabOffsetMinutes: 0
    })

    expect(start.toFormat('yyyy-MM-dd HH:mm')).toBe('2026-09-20 20:00')
    expect(end.diff(start, 'hours').hours).toBe(8)
  })

  it('keeps the time of day when the drop has no time at all', () => {
    const origStart = DateTime.fromISO('2026-09-13T09:30:00', { zone: 'utc' })
    const origEnd = DateTime.fromISO('2026-09-13T10:30:00', { zone: 'utc' })

    const { start, end } = resolveDropRange({
      allDay: false,
      origStart,
      origEnd,
      segmentStart: origStart,
      targetDate
    })

    expect(start.toFormat('yyyy-MM-dd HH:mm')).toBe('2026-09-20 09:30')
    expect(end.diff(start, 'minutes').minutes).toBe(60)
  })

  it('leaves an all-day event all-day-shaped when it is dropped on a day cell', () => {
    // Dropping onto another day's all-day lane is a date change, not a
    // conversion: the hour branch must not fire without a pointer time.
    const { start, end } = resolveDropRange({
      allDay: true,
      origStart: allDayStart,
      origEnd: allDayEnd,
      segmentStart: allDayStart,
      targetDate
    })

    expect(start.toFormat('HH:mm')).toBe('00:00')
    expect(Math.round(end.diff(start, 'hours').hours)).toBe(24)
  })
})

describe('snap step applied to drops', () => {
  const targetDate = DateTime.fromISO('2026-09-20T00:00:00', { zone: 'utc' })

  it('snaps the pointer reading to the configured step', () => {
    expect(minutesFromPointer(638, 0, 60)).toBe(645) // 15-minute default
    expect(minutesFromPointer(638, 0, 60, 30)).toBe(630)
    expect(minutesFromPointer(638, 0, 60, 60)).toBe(660)
  })

  it('keeps the last slot of the day reachable at every step', () => {
    // The clamp is one step short of midnight, so an hour step must still allow
    // 23:00 rather than pinning the last hour to 23:45.
    expect(minutesFromPointer(1e6, 0, 60, 60)).toBe(23 * 60)
    expect(minutesFromPointer(1e6, 0, 60, 30)).toBe(23 * 60 + 30)
    expect(minutesFromPointer(1e6, 0, 60, 15)).toBe(23 * 60 + 45)
  })

  it('places an all-day drop on the configured grid', () => {
    const onHour = timedRangeForAllDayDrop({
      targetDate,
      pointerMinutes: 14 * 60 + 20,
      snapStepMinutes: 60
    })
    expect(onHour.start.toFormat('HH:mm')).toBe('14:00')

    const onQuarter = timedRangeForAllDayDrop({ targetDate, pointerMinutes: 14 * 60 + 20 })
    expect(onQuarter.start.toFormat('HH:mm')).toBe('14:15')
  })

  it('shifts a timed drop on the configured grid', () => {
    const origStart = DateTime.fromISO('2026-09-13T09:00:00', { zone: 'utc' })
    const origEnd = origStart.plus({ hours: 2 })

    const { start, end } = resolveDropRange({
      allDay: false,
      origStart,
      origEnd,
      segmentStart: origStart,
      targetDate,
      targetMinutes: 14 * 60 + 20,
      grabOffsetMinutes: 0,
      snapStepMinutes: 60
    })

    expect(start.toFormat('HH:mm')).toBe('14:00')
    // The span survives the snap - only the start moves onto the grid.
    expect(end.diff(start, 'hours').hours).toBe(2)
  })
})

describe('a dropped start always lands on the grid', () => {
  const day = DateTime.fromISO('2026-09-20T00:00:00', { zone: 'utc' })

  /**
   * Regression. The drop was computed as a delta added to the event's own start,
   * and the delta is measured from the slice being dragged - which for a
   * multi-day event is midnight, not the event's start. An event beginning at
   * 09:07 therefore kept its :07 through every drop and could never reach a
   * round time. Provider events start at arbitrary minutes, so this was common.
   */
  function reachableStarts(args: {
    origStart: string
    origEnd: string
    segmentStart: string
    step: number
  }) {
    const origStart = DateTime.fromISO(args.origStart, { zone: 'utc' })
    const origEnd = DateTime.fromISO(args.origEnd, { zone: 'utc' })
    const segmentStart = DateTime.fromISO(args.segmentStart, { zone: 'utc' })
    const starts = new Set<string>()
    for (let grabY = 0; grabY <= 60; grabY += 5) {
      const grab = grabOffsetMinutes(grabY, 0, 60, 60, args.step)
      for (let py = 600; py <= 660; py += 3) {
        const pointer = minutesFromPointer(py, 0, 60, args.step)
        const { start } = resolveDropRange({
          allDay: false,
          origStart,
          origEnd,
          segmentStart,
          targetDate: day,
          targetMinutes: pointer,
          grabOffsetMinutes: grab,
          snapStepMinutes: args.step
        })
        starts.add(start.toFormat('HH:mm'))
      }
    }
    return [...starts]
  }

  const offGridMultiDay = {
    origStart: '2026-09-13T09:07:00',
    origEnd: '2026-09-15T11:00:00',
    segmentStart: '2026-09-14T00:00:00'
  }

  it('reaches round times even when the event itself starts at an odd minute', () => {
    const starts = reachableStarts({ ...offGridMultiDay, step: 15 })
    for (const s of starts) expect(Number(s.slice(3)) % 15, s).toBe(0)
    expect(starts).toContain('19:00')
    expect(starts).toContain('19:30')
  })

  it('offers only half hours on a 30-minute step', () => {
    const starts = reachableStarts({ ...offGridMultiDay, step: 30 })
    for (const s of starts) expect(Number(s.slice(3)) % 30, s).toBe(0)
  })

  it('offers only whole hours on a 60-minute step', () => {
    const starts = reachableStarts({ ...offGridMultiDay, step: 60 })
    for (const s of starts) expect(s.slice(3), s).toBe('00')
  })

  it('keeps the span exactly while moving the start onto the grid', () => {
    const origStart = DateTime.fromISO('2026-09-13T09:07:00', { zone: 'utc' })
    const origEnd = DateTime.fromISO('2026-09-15T11:00:00', { zone: 'utc' })
    const { start, end } = resolveDropRange({
      allDay: false,
      origStart,
      origEnd,
      segmentStart: DateTime.fromISO('2026-09-14T00:00:00', { zone: 'utc' }),
      targetDate: day,
      targetMinutes: 14 * 60,
      grabOffsetMinutes: 0,
      snapStepMinutes: 15
    })
    expect(start.minute % 15).toBe(0)
    expect(end.diff(start, 'minutes').minutes).toBe(origEnd.diff(origStart, 'minutes').minutes)
  })

  it('snaps the grab offset so the preview and the drop agree on the grid', () => {
    // A mid-block grab of a 50-minute event used to yield an offset of 25, which
    // is not on any grid and skewed every drop that subtracted it.
    expect(grabOffsetMinutes(25, 0, 50, 50, 15) % 15).toBe(0)
    expect(grabOffsetMinutes(25, 0, 50, 50, 30) % 30).toBe(0)
  })
})

describe('singleDayRange', () => {
  const start = DateTime.fromISO('2026-09-20T14:00:00', { zone: 'utc' })

  it('leaves a range that already fits inside the day alone', () => {
    const end = start.plus({ hours: 2 })
    expect(singleDayRange(start, end).end.toISO()).toBe(end.toISO())
  })

  it('trims a multi-day span to the end of the starting day', () => {
    const { end } = singleDayRange(start, start.plus({ days: 3 }))
    expect(end.toISODate()).toBe('2026-09-20')
    expect(end.diff(start, 'hours').hours).toBeLessThanOrEqual(10)
  })

  it('leaves the trimmed end on the grid', () => {
    const { end } = singleDayRange(start, start.plus({ days: 3 }), 30)
    expect(end.minute % 30).toBe(0)
  })

  it('never produces a zero-length event at the very end of the day', () => {
    const late = DateTime.fromISO('2026-09-20T23:50:00', { zone: 'utc' })
    const { start: s, end } = singleDayRange(late, late.plus({ days: 2 }), 15)
    expect(end.diff(s, 'minutes').minutes).toBeGreaterThanOrEqual(15)
  })
})

describe('the configured step survives a real timezone', () => {
  function withZone<T>(zone: string, fn: () => T): T {
    const previous = Settings.defaultZone
    Settings.defaultZone = zone
    try {
      return fn()
    } finally {
      Settings.defaultZone = previous
    }
  }

  /**
   * The snap correction is computed from the *local* wall clock, because that is
   * the grid the user sees. Events are stored in UTC, so in a zone with a
   * non-zero offset a drop that looks snapped in UTC can be off-grid on screen.
   * Sydney is +10/+11, which keeps whole hours aligned; Kathmandu is +05:45,
   * which does not - if anything ever reads the UTC clock instead of the local
   * one, that zone is where it shows up.
   */
  for (const zone of ['UTC', 'Australia/Sydney', 'Asia/Kathmandu', 'America/Los_Angeles']) {
    it(`lands on the half hour in ${zone}`, () => {
      withZone(zone, () => {
        const origStart = DateTime.fromISO('2026-09-13T09:07', { zone }).toUTC().setZone(zone)
        const origEnd = origStart.plus({ minutes: 60 })
        const targetDate = DateTime.fromISO('2026-09-20T00:00', { zone })

        for (let py = 540; py <= 720; py += 7) {
          const pointer = minutesFromPointer(py, 0, 60, 30)
          const { start, end } = resolveDropRange({
            allDay: false,
            origStart,
            origEnd,
            segmentStart: origStart,
            targetDate,
            targetMinutes: pointer,
            grabOffsetMinutes: grabOffsetMinutes(20, 0, 60, 60, 30),
            snapStepMinutes: 30
          })
          expect(start.minute % 30, `${zone} @ ${start.toISO()}`).toBe(0)
          expect(end.diff(start, 'minutes').minutes).toBe(60)
        }
      })
    })
  }
})

describe('dropping a timed event onto the all-day lane', () => {
  const targetDate = DateTime.fromISO('2026-09-20T00:00:00', { zone: 'utc' })

  function dropOnLane(startISO: string, endISO: string) {
    return resolveDropRange({
      allDay: false,
      origStart: DateTime.fromISO(startISO, { zone: 'utc' }),
      origEnd: DateTime.fromISO(endISO, { zone: 'utc' }),
      segmentStart: DateTime.fromISO(startISO, { zone: 'utc' }),
      targetDate,
      toAllDayLane: true
    })
  }

  it('becomes a whole day rather than keeping its clock times', () => {
    const { start, end } = dropOnLane('2026-09-13T09:00:00', '2026-09-13T10:00:00')

    expect(start.toISO()).toBe('2026-09-20T00:00:00.000Z')
    expect(end.toISO()).toBe('2026-09-20T23:59:59.999Z')
  })

  it('keeps the number of days an event already covered', () => {
    const { start, end } = dropOnLane('2026-09-13T09:00:00', '2026-09-15T10:00:00')

    expect(start.toISODate()).toBe('2026-09-20')
    expect(end.toISODate()).toBe('2026-09-22')
  })

  it('is the exact mirror of dragging an all-day event onto the grid', () => {
    const toTimed = timedRangeForAllDayDrop({ targetDate, pointerMinutes: 9 * 60 })
    expect(toTimed.start.toFormat('HH:mm')).toBe('09:00')

    const backToAllDay = dropOnLane('2026-09-20T09:00:00', '2026-09-20T10:00:00')
    expect(backToAllDay.start.hour).toBe(0)
  })

  for (const zone of ['UTC', 'Australia/Sydney', 'Asia/Ho_Chi_Minh', 'America/Los_Angeles']) {
    it(`stores a floating date, not a converted local midnight, in ${zone}`, () => {
      const previous = Settings.defaultZone
      Settings.defaultZone = zone
      try {
        // All-day events are floating dates pinned to midnight UTC. Building the
        // range from a local midnight and converting would land a day early west
        // of GMT - the bug that once made every Sunday event vanish.
        const { start, end } = resolveDropRange({
          allDay: false,
          origStart: DateTime.fromISO('2026-09-13T09:00', { zone }),
          origEnd: DateTime.fromISO('2026-09-13T10:00', { zone }),
          segmentStart: DateTime.fromISO('2026-09-13T09:00', { zone }),
          targetDate: DateTime.fromISO('2026-09-20T00:00', { zone }),
          toAllDayLane: true
        })

        expect(start.toUTC().toISO(), zone).toBe('2026-09-20T00:00:00.000Z')
        expect(end.toUTC().toISO(), zone).toBe('2026-09-20T23:59:59.999Z')
      } finally {
        Settings.defaultZone = previous
      }
    })
  }
})

describe('dropNeedsMoveOrCopyChoice', () => {
  it('asks when a timed event stays timed - the only ambiguous case', () => {
    // Dropped on the hourly grid.
    expect(dropNeedsMoveOrCopyChoice({ sourceAllDay: false, targetAllDay: false })).toBe(true)
    // Dropped on a Month view day cell, which changes the date and keeps the time.
    expect(dropNeedsMoveOrCopyChoice({ sourceAllDay: false, targetAllDay: undefined })).toBe(true)
  })

  it('does not ask when the drop converts between all-day and timed', () => {
    // Timed onto the all-day lane, and all-day onto the hourly grid. Both are
    // conversions the gesture already performed.
    expect(dropNeedsMoveOrCopyChoice({ sourceAllDay: false, targetAllDay: true })).toBe(false)
    expect(dropNeedsMoveOrCopyChoice({ sourceAllDay: true, targetAllDay: false })).toBe(false)
  })

  it('does not ask when an all-day event moves to another day', () => {
    expect(dropNeedsMoveOrCopyChoice({ sourceAllDay: true, targetAllDay: true })).toBe(false)
    expect(dropNeedsMoveOrCopyChoice({ sourceAllDay: true, targetAllDay: undefined })).toBe(false)
  })
})

describe('reaching the last block of the day', () => {
  it('stops one step short of midnight for a start', () => {
    // Nothing can begin at the end of the day.
    expect(minutesFromPointer(1e6, 0, 60, 30)).toBe(23 * 60 + 30)
    expect(minutesFromPointer(1e6, 0, 60, 60)).toBe(23 * 60)
  })

  it('reaches midnight for the moving edge of a drag', () => {
    // Regression: dragging out a new event could never fill 23:30-00:00, because
    // the edge that follows the pointer was clamped like a start.
    expect(minutesFromPointer(1e6, 0, 60, 30, true)).toBe(24 * 60)
    expect(minutesFromPointer(1e6, 0, 60, 60, true)).toBe(24 * 60)
    expect(minutesFromPointer(1e6, 0, 60, 15, true)).toBe(24 * 60)
  })

  it('still refuses to go above the top of the grid', () => {
    expect(minutesFromPointer(-1e6, 0, 60, 30, true)).toBe(0)
  })
})

describe('dropping on a day that changes offset', () => {
  function withZone<T>(zone: string, fn: () => T): T {
    const previous = Settings.defaultZone
    Settings.defaultZone = zone
    try {
      return fn()
    } finally {
      Settings.defaultZone = previous
    }
  }

  /**
   * `startOf('day').plus({ minutes })` adds elapsed time, so on the day a zone
   * springs forward it steps over the missing hour: dropping on the 10:00 row of
   * 4 October in Sydney produced an event at 11:00.
   */
  it('lands on the row the pointer is over, on a spring-forward day', () => {
    withZone('Australia/Sydney', () => {
      // 4 Oct 2026: 02:00 -> 03:00, so the day is 23 hours long.
      const springForward = DateTime.fromISO('2026-10-04T00:00', { zone: 'Australia/Sydney' })
      const { start, end } = dropRangeFromPointer({
        targetDate: springForward,
        pointerMinutes: 10 * 60,
        durationMinutes: 60
      })

      expect(start.toFormat('HH:mm')).toBe('10:00')
      expect(end.toFormat('HH:mm')).toBe('11:00')
    })
  })

  it('lands on the right row on a fall-back day too', () => {
    withZone('America/New_York', () => {
      // 1 Nov 2026: 02:00 happens twice, so the day is 25 hours long.
      const fallBack = DateTime.fromISO('2026-11-01T00:00', { zone: 'America/New_York' })
      const { start } = dropRangeFromPointer({
        targetDate: fallBack,
        pointerMinutes: 10 * 60,
        durationMinutes: 60
      })

      expect(start.toFormat('HH:mm')).toBe('10:00')
    })
  })

  it('reaches the end of a short day', () => {
    withZone('Australia/Sydney', () => {
      const springForward = DateTime.fromISO('2026-10-04T00:00', { zone: 'Australia/Sydney' })
      const { start } = dropRangeFromPointer({
        targetDate: springForward,
        pointerMinutes: 24 * 60,
        durationMinutes: 60
      })

      expect(start.toISODate()).toBe('2026-10-05')
      expect(start.toFormat('HH:mm')).toBe('00:00')
    })
  })

  it('keeps a shifted event the same length in real time across the change', () => {
    withZone('Australia/Sydney', () => {
      const origStart = DateTime.fromISO('2026-09-29T10:00', { zone: 'Australia/Sydney' })
      const origEnd = origStart.plus({ minutes: 90 })
      const { start, end } = resolveDropRange({
        allDay: false,
        origStart,
        origEnd,
        segmentStart: origStart,
        targetDate: DateTime.fromISO('2026-10-04T00:00', { zone: 'Australia/Sydney' }),
        targetMinutes: 10 * 60,
        grabOffsetMinutes: 0,
        snapStepMinutes: 30
      })

      expect(start.toFormat('HH:mm')).toBe('10:00')
      expect(end.diff(start, 'minutes').minutes).toBe(90)
    })
  })
})
