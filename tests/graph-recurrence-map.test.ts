import { describe, it, expect } from 'vitest'
import {
  graphRecurrenceToRrule,
  rruleToGraphRecurrence,
  type GraphRecurrence
} from '../src/main/sync/graph-recurrence-map'

describe('Microsoft Graph Recurrence Pattern Mapper', () => {
  it('should map daily recurrence with interval', () => {
    const graph: GraphRecurrence = {
      pattern: { type: 'daily', interval: 2 },
      range: { type: 'noEnd', startDate: '2026-08-01' }
    }
    const rrule = graphRecurrenceToRrule(graph)
    expect(rrule).toBe('FREQ=DAILY;INTERVAL=2')

    const backToGraph = rruleToGraphRecurrence(rrule, '2026-08-01')
    expect(backToGraph.pattern.type).toBe('daily')
    expect(backToGraph.pattern.interval).toBe(2)
    expect(backToGraph.range.type).toBe('noEnd')
  })

  it('should map weekly recurrence on Monday, Wednesday, Friday with Count limit', () => {
    const graph: GraphRecurrence = {
      pattern: {
        type: 'weekly',
        interval: 1,
        daysOfWeek: ['monday', 'wednesday', 'friday']
      },
      range: {
        type: 'numbered',
        startDate: '2026-08-01',
        numberOfOccurrences: 12
      }
    }
    const rrule = graphRecurrenceToRrule(graph)
    expect(rrule).toBe('FREQ=WEEKLY;BYDAY=MO,WE,FR;COUNT=12')

    const backToGraph = rruleToGraphRecurrence(rrule, '2026-08-01')
    expect(backToGraph.pattern.type).toBe('weekly')
    expect(backToGraph.pattern.daysOfWeek).toEqual(['monday', 'wednesday', 'friday'])
    expect(backToGraph.range.numberOfOccurrences).toBe(12)
  })

  it('should map absolute monthly recurrence on day 15 with endDate', () => {
    const graph: GraphRecurrence = {
      pattern: {
        type: 'absoluteMonthly',
        interval: 1,
        dayOfMonth: 15
      },
      range: {
        type: 'endDate',
        startDate: '2026-08-01',
        endDate: '2026-12-31'
      }
    }
    const rrule = graphRecurrenceToRrule(graph)
    expect(rrule).toBe('FREQ=MONTHLY;BYMONTHDAY=15;UNTIL=20261231T235959Z')

    const backToGraph = rruleToGraphRecurrence(rrule, '2026-08-01')
    expect(backToGraph.pattern.type).toBe('absoluteMonthly')
    expect(backToGraph.pattern.dayOfMonth).toBe(15)
    expect(backToGraph.range.endDate).toBe('2026-12-31')
  })

  it('should map relative monthly recurrence on second Tuesday', () => {
    const graph: GraphRecurrence = {
      pattern: {
        type: 'relativeMonthly',
        interval: 1,
        index: 'second',
        daysOfWeek: ['tuesday']
      },
      range: {
        type: 'noEnd',
        startDate: '2026-08-01'
      }
    }
    const rrule = graphRecurrenceToRrule(graph)
    expect(rrule).toBe('FREQ=MONTHLY;BYDAY=2TU')

    const backToGraph = rruleToGraphRecurrence(rrule, '2026-08-01')
    expect(backToGraph.pattern.type).toBe('relativeMonthly')
    expect(backToGraph.pattern.index).toBe('second')
    expect(backToGraph.pattern.daysOfWeek).toEqual(['tuesday'])
  })
})
