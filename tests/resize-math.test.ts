import { DateTime } from 'luxon'
import { describe, expect, it } from 'vitest'
import {
  applyResizeEdge,
  dayFromClientX,
  daysDeltaFromPointer,
  formatResizeTooltip,
  snapMinutes
} from '../src/renderer/src/dnd/resize-math'

describe('resize math', () => {
  it('snaps to 15-minute marks', () => {
    expect(snapMinutes(7)).toBe(0)
    expect(snapMinutes(8)).toBe(15)
    expect(snapMinutes(22)).toBe(15)
    expect(snapMinutes(23)).toBe(30)
    expect(snapMinutes(60)).toBe(60)
  })

  it('maps south-edge pointer Y to a snapped end time', () => {
    const originStart = DateTime.local(2026, 8, 19, 10, 0)
    const originEnd = DateTime.local(2026, 8, 19, 11, 0)
    const { start, end } = applyResizeEdge({
      edge: 's',
      originStart,
      originEnd,
      clientX: 0,
      clientY: 11.25 * 56,
      gridTop: 0,
      hourHeight: 56
    })
    expect(start.toISO()).toBe(originStart.toISO())
    expect(end.hour).toBe(11)
    expect(end.minute).toBe(15)
  })

  it('clamps duration to at least 15 minutes', () => {
    const originStart = DateTime.local(2026, 8, 19, 10, 0)
    const originEnd = DateTime.local(2026, 8, 19, 11, 0)
    const { start, end } = applyResizeEdge({
      edge: 's',
      originStart,
      originEnd,
      clientX: 0,
      clientY: 10 * 56,
      gridTop: 0,
      hourHeight: 56
    })
    expect(Math.round(end.diff(start, 'minutes').minutes)).toBe(15)
  })

  it('shifts the end date by whole columns when dragging east', () => {
    const originStart = DateTime.local(2026, 8, 19, 10, 0)
    const originEnd = DateTime.local(2026, 8, 19, 11, 0)
    const { start, end } = applyResizeEdge({
      edge: 'e',
      originStart,
      originEnd,
      clientX: 0,
      clientY: 0,
      gridTop: 0,
      hourHeight: 56,
      daysDelta: 2
    })
    expect(start.toISO()).toBe(originStart.toISO())
    expect(end.day).toBe(21)
    expect(end.hour).toBe(11)
    expect(end.minute).toBe(0)
  })

  it('snaps horizontal movement to whole columns', () => {
    expect(daysDeltaFromPointer(100, 140, 100)).toBe(0)
    expect(daysDeltaFromPointer(100, 160, 100)).toBe(1)
    expect(daysDeltaFromPointer(100, 40, 100)).toBe(-1)
  })

  it('picks the nearest column when the pointer is outside the grid', () => {
    const mon = DateTime.local(2026, 8, 17)
    const tue = DateTime.local(2026, 8, 18)
    const columns = [
      { left: 100, right: 200, day: mon },
      { left: 200, right: 300, day: tue }
    ]
    expect(dayFromClientX(50, columns)?.day).toBe(17)
    expect(dayFromClientX(250, columns)?.day).toBe(18)
    expect(dayFromClientX(400, columns)?.day).toBe(18)
  })

  it('formats a clock tooltip with duration', () => {
    const start = DateTime.local(2026, 8, 19, 10, 0)
    const end = DateTime.local(2026, 8, 19, 11, 30)
    expect(formatResizeTooltip('s', start, end, '24h')).toBe('11:30 · 1h 30m')
    expect(formatResizeTooltip('e', start, end, '24h')).toContain('19/08 11:30')
  })
})
