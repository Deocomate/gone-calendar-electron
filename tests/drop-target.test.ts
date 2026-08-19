import { describe, expect, it } from 'vitest'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { DateTime } from 'luxon'
import { clampHour, dropRangeFromPointer, hourFromPointer, minutesFromPointer, sameDropTarget, shiftOccurrenceByDrop } from '../src/renderer/src/dnd/drop-target'
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
