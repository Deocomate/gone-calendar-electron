import type { ExpandedOccurrence } from './event-model'

/**
 * The order a single day's occurrences should read in.
 *
 * All-day entries come first, then timed ones by when they actually start.
 * Sorting on `startUtc` alone does not give this: an all-day occurrence is a
 * floating date stored at UTC midnight, while a timed one is a real instant, so
 * east of GMT a 09:00 event (22:00Z the previous day) sorts ahead of the all-day
 * entry for its own date. The two are different kinds of value and have to be
 * separated before being compared.
 */
export function compareOccurrencesWithinDay(
  a: ExpandedOccurrence,
  b: ExpandedOccurrence
): number {
  if (a.allDay !== b.allDay) return a.allDay ? -1 : 1

  if (a.allDay) {
    // Both floating: earlier start first, then the longer span, so a multi-day
    // banner sits above the single days it runs through.
    const byStart = a.startUtc.localeCompare(b.startUtc)
    if (byStart !== 0) return byStart
    const byEnd = b.endUtc.localeCompare(a.endUtc)
    if (byEnd !== 0) return byEnd
  } else {
    // Both instants: plain chronological order.
    const byStart = a.startUtc.localeCompare(b.startUtc)
    if (byStart !== 0) return byStart
  }

  // Stable, predictable tiebreak so equal-time events don't reshuffle between
  // renders.
  const byTitle = a.title.localeCompare(b.title)
  return byTitle !== 0 ? byTitle : a.id.localeCompare(b.id)
}

/** Convenience wrapper; returns a new array rather than sorting in place. */
export function sortOccurrencesWithinDay(
  occurrences: ExpandedOccurrence[]
): ExpandedOccurrence[] {
  return [...occurrences].sort(compareOccurrencesWithinDay)
}
