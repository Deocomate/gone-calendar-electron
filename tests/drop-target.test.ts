import { describe, expect, it } from 'vitest'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { DateTime } from 'luxon'
import {
  clampHour,
  dropRangeFromPointer,
  hourFromPointer,
  minutesFromPointer,
  sameDropTarget,
  shiftOccurrenceByDrop,
  timedRangeForAllDayDrop,
  ALL_DAY_TO_TIMED_MINUTES,
  resolveDropRange
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
