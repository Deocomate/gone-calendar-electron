import { DateTime } from 'luxon'
import { describe, expect, it } from 'vitest'
import {
  applyResizeEdge,
  formatResizeTooltip,
  snapMinutes,
  SNAP_STEP_OPTIONS,
  type ResizeEdge
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




  it('formats a clock tooltip with duration', () => {
    const start = DateTime.local(2026, 8, 19, 10, 0)
    const end = DateTime.local(2026, 8, 19, 11, 30)
    expect(formatResizeTooltip('s', start, end, '24h')).toBe('11:30 · 1h 30m')
    expect(formatResizeTooltip('n', start, end, '24h')).toBe('10:00 · 1h 30m')
  })
})

describe('configurable snap step', () => {
  const gridTop = 0
  const hourHeight = 60 // 1px per minute, so clientY is minutes from midnight
  const day = DateTime.fromISO('2026-09-20T00:00:00', { zone: 'utc' })

  function resizeTo(clientY: number, snapStepMinutes?: number) {
    return applyResizeEdge({
      edge: 's',
      originStart: day.set({ hour: 9 }),
      originEnd: day.set({ hour: 10 }),
      clientX: 0,
      clientY,
      gridTop,
      hourHeight,
      snapStepMinutes
    })
  }

  it('defaults to the 15-minute grid when no step is given', () => {
    // A pointer at 10:38 rounds to the nearest quarter hour.
    expect(resizeTo(638).end.toFormat('HH:mm')).toBe('10:45')
  })

  it('rounds to the half hour on a 30-minute step', () => {
    expect(resizeTo(638, 30).end.toFormat('HH:mm')).toBe('10:30')
    expect(resizeTo(650, 30).end.toFormat('HH:mm')).toBe('11:00')
  })

  it('rounds to the hour on a 60-minute step', () => {
    expect(resizeTo(638, 60).end.toFormat('HH:mm')).toBe('11:00')
    expect(resizeTo(620, 60).end.toFormat('HH:mm')).toBe('10:00')
  })

  it('raises the minimum duration to match the step', () => {
    // Dragging the bottom edge up past the start. On a one-hour grid the result
    // must still be an hour, not the old fixed 15-minute floor - otherwise the
    // event lands off the grid the drag just snapped to.
    const hourStep = resizeTo(540, 60)
    expect(hourStep.end.diff(hourStep.start, 'minutes').minutes).toBe(60)

    const halfStep = resizeTo(540, 30)
    expect(halfStep.end.diff(halfStep.start, 'minutes').minutes).toBe(30)

    const quarterStep = resizeTo(540, 15)
    expect(quarterStep.end.diff(quarterStep.start, 'minutes').minutes).toBe(15)
  })

  it('never shortens below 15 minutes even if asked for a smaller step', () => {
    const tiny = resizeTo(540, 5)
    expect(tiny.end.diff(tiny.start, 'minutes').minutes).toBe(15)
  })

  it('offers exactly the three steps the settings panel shows', () => {
    expect([...SNAP_STEP_OPTIONS]).toEqual([15, 30, 60])
  })
})

describe('resizing is vertical only', () => {
  it('offers just the two edges', () => {
    // East and west stretched an event across whole days - a one-hour event
    // became a 25-hour one - and were easy to catch while aiming to drag the
    // block. Changing which days an event spans belongs in the editor.
    const edges: ResizeEdge[] = ['n', 's']
    expect(edges).toHaveLength(2)
  })

  it('never changes the date, however far sideways the pointer goes', () => {
    const originStart = DateTime.local(2026, 8, 19, 10, 0)
    const originEnd = DateTime.local(2026, 8, 19, 11, 0)

    for (const clientX of [-5000, 0, 5000]) {
      const { start, end } = applyResizeEdge({
        edge: 's',
        originStart,
        originEnd,
        clientX,
        clientY: 12 * 60,
        gridTop: 0,
        hourHeight: 60
      })
      expect(start.toISODate()).toBe('2026-08-19')
      expect(end.toISODate()).toBe('2026-08-19')
      expect(end.toFormat('HH:mm')).toBe('12:00')
    }
  })
})
