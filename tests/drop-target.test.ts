import { describe, expect, it } from 'vitest'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { DateTime } from 'luxon'
import { clampHour, hourFromPointer, sameDropTarget } from '../src/renderer/src/dnd/drop-target'
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
    expect(sameDropTarget({ dateKey: '2026-08-18' }, { dateKey: '2026-08-19' })).toBe(false)
  })

  it('clamps pointer hours into the visible day grid', () => {
    expect(clampHour(-4)).toBe(0)
    expect(clampHour(9.8)).toBe(9)
    expect(clampHour(30)).toBe(23)
    expect(hourFromPointer(120, 0, 60)).toBe(2)
    expect(hourFromPointer(-20, 0, 60)).toBe(0)
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
