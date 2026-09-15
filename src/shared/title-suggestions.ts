import { DateTime } from 'luxon'
import { occurrenceDateKey } from './all-day'

/**
 * Ranking for the event-title autocomplete.
 *
 * The point is not to find every event whose title contains what you typed -
 * `searchEvents` already does that. It is to answer "given what I usually put
 * here, at this time, on this day, what am I most likely about to write?", and
 * to carry the calendar that title normally lives on along with the answer.
 *
 * Four signals, combined behind a match gate:
 *
 * - **frequency** - how often the title has come up in the lookback window
 * - **recency**   - how long ago it last did, on a 30-day half-life
 * - **time fit**  - how close the slot being filled is to the hours this title
 *                   normally occupies
 * - **day fit**   - how often it lands on this weekday
 *
 * Everything here is pure so the weights can be argued with in a test rather
 * than by staring at the running app.
 */

/** One past event, flattened to just what ranking needs. */
export interface TitleSample {
  title: string
  calendarId: string
  /** ISO 8601 UTC, as stored. */
  startUtc: string
  endUtc: string
  allDay: boolean
  location: string | null
  rrule: string | null
}

export interface TitleSuggestion {
  /** Display casing, taken from the most recent event with this title. */
  title: string
  /** The calendar this title normally lives on - what picking it applies. */
  calendarId: string
  /** Estimated number of times it occurred in the window, recurrence expanded. */
  uses: number
  lastUsedUtc: string
  /** Median length of its timed occurrences; null if it is only ever all-day. */
  durationMinutes: number | null
  /** True when its occurrences are usually all-day. */
  allDay: boolean
  location: string | null
  score: number
}

export interface SuggestTitlesOptions {
  /** What the user has typed so far. Empty means "what usually goes here?". */
  query: string
  /** Start of the slot being filled, ISO 8601 UTC. */
  targetStartUtc: string
  targetAllDay: boolean
  /** Injectable so tests do not depend on the wall clock. */
  now?: DateTime
  limit?: number
}

/** Average days per period, used only to estimate how often a series fires. */
const FREQ_DAYS: Record<string, number> = {
  DAILY: 1,
  WEEKLY: 7,
  MONTHLY: 30.44,
  YEARLY: 365.25
}

/** Recency half-life. A title last used 30 days ago scores half of one used today. */
const RECENCY_HALF_LIFE_DAYS = 30

/** Spread of the time-of-day fit curve, in hours. 2h off still scores ~0.73. */
const HOUR_SIGMA = 2.5

/** `uses` at which the frequency signal saturates. */
const FREQ_SATURATION = 40

const WEIGHTS = { freq: 0.34, recency: 0.28, timeFit: 0.26, dayFit: 0.12 }

/** Collapses case and runs of whitespace so "Team  Standup" and "team standup" group. */
export function normalizeTitle(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, ' ')
}

function parseRruleParts(rrule: string): Record<string, string> {
  const parts: Record<string, string> = {}
  for (const chunk of rrule.replace(/^RRULE:/i, '').split(';')) {
    const eq = chunk.indexOf('=')
    if (eq > 0) parts[chunk.slice(0, eq).toUpperCase()] = chunk.slice(eq + 1)
  }
  return parts
}

/** `20260301T090000Z` (RFC 5545 form) or an already-ISO string -> ISO UTC. */
function untilToIso(until: string): string | null {
  const compact = until.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})Z?)?$/)
  if (compact) {
    const [, y, m, d, hh = '00', mm = '00', ss = '00'] = compact
    return `${y}-${m}-${d}T${hh}:${mm}:${ss}.000Z`
  }
  const dt = DateTime.fromISO(until, { zone: 'utc' })
  return dt.isValid ? dt.toUTC().toISO() : null
}

/**
 * How many times a stored row actually happened inside the window.
 *
 * A weekly standup is one row, not fifty-two, so counting rows would rank the
 * most habitual events lowest - exactly backwards. Expanding the RRULE properly
 * would mean running the expander over every candidate on every keystroke, so
 * this estimates from FREQ/INTERVAL/BYDAY instead. Being a few occurrences out
 * does not change an ordering that then goes through a log curve.
 */
export function estimateOccurrences(
  sample: Pick<TitleSample, 'rrule' | 'startUtc'>,
  windowStartUtc: string,
  nowUtc: string
): number {
  if (!sample.rrule) return 1

  const parts = parseRruleParts(sample.rrule)
  const period = FREQ_DAYS[(parts.FREQ || '').toUpperCase()]
  if (!period) return 1

  const interval = Math.max(1, Number(parts.INTERVAL) || 1)
  const from = sample.startUtc > windowStartUtc ? sample.startUtc : windowStartUtc
  const untilIso = parts.UNTIL ? untilToIso(parts.UNTIL) : null
  const to = untilIso && untilIso < nowUtc ? untilIso : nowUtc
  if (to <= from) return 0

  const days = DateTime.fromISO(to, { zone: 'utc' }).diff(
    DateTime.fromISO(from, { zone: 'utc' }),
    'days'
  ).days

  const perPeriod = parts.BYDAY ? parts.BYDAY.split(',').filter(Boolean).length : 1
  let n = (days / (period * interval)) * perPeriod
  if (parts.COUNT) n = Math.min(n, Math.max(0, Number(parts.COUNT)))

  return Math.max(1, Math.round(n))
}

/**
 * When this title was last actually used.
 *
 * For a plain event that is its start. For a live series it is "now" - a weekly
 * meeting set up in 2023 and still running is not two years stale, and using
 * its dtstart would bury the most-used titles in the list.
 */
export function effectiveLastUsed(
  sample: Pick<TitleSample, 'rrule' | 'startUtc'>,
  nowUtc: string
): string {
  if (!sample.rrule) return sample.startUtc
  const parts = parseRruleParts(sample.rrule)
  const untilIso = parts.UNTIL ? untilToIso(parts.UNTIL) : null
  if (untilIso && untilIso < nowUtc) return untilIso
  return sample.startUtc > nowUtc ? sample.startUtc : nowUtc
}

/**
 * How well a stored title answers what has been typed.
 *
 * Returns 0 for "not a match at all", which drops the candidate. A whole-string
 * prefix beats a word-start prefix, which beats an interior substring, by
 * enough that the other signals reorder within a tier rather than across tiers.
 * Multi-token queries must match every token; the weakest token sets the tier.
 */
export function matchWeight(normalizedTitle: string, normalizedQuery: string): number {
  if (!normalizedQuery) return 1
  if (normalizedTitle.startsWith(normalizedQuery)) return 1

  const words = normalizedTitle.split(' ')
  let weight = 1

  for (const token of normalizedQuery.split(' ').filter(Boolean)) {
    let tier = 0
    if (words.some((w) => w.startsWith(token))) tier = 0.75
    else if (normalizedTitle.includes(token)) tier = 0.35
    if (tier === 0) return 0
    weight = Math.min(weight, tier)
  }

  return weight
}

/** Shortest distance between two hours on a 24-hour clock: 23:00 and 01:00 are 2 apart. */
function hourDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 24
  return Math.min(d, 24 - d)
}

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? Math.round((sorted[mid - 1] + sorted[mid]) / 2) : sorted[mid]
}

function mostCommon<T>(values: T[]): T | undefined {
  const counts = new Map<T, number>()
  let best: T | undefined
  let bestCount = 0
  for (const v of values) {
    const n = (counts.get(v) ?? 0) + 1
    counts.set(v, n)
    // Strictly greater, and `values` arrives newest-first, so a tie keeps the
    // most recently used one.
    if (n > bestCount) {
      best = v
      bestCount = n
    }
  }
  return best
}

interface Group {
  display: string
  samples: TitleSample[]
  uses: number
  lastUsedUtc: string
}

export function rankTitleSuggestions(
  samples: TitleSample[],
  options: SuggestTitlesOptions
): TitleSuggestion[] {
  const now = options.now ?? DateTime.utc()
  const nowUtc = now.toUTC().toISO()!
  const windowStartUtc = now.minus({ days: 365 }).toUTC().toISO()!
  const limit = options.limit ?? 6
  const normalizedQuery = normalizeTitle(options.query)

  const target = DateTime.fromISO(options.targetStartUtc, { zone: 'utc' }).toLocal()
  const targetHour = target.hour + target.minute / 60
  const targetWeekday = DateTime.fromISO(
    occurrenceDateKey(options.targetAllDay, options.targetStartUtc)
  ).weekday

  // Group by normalized title, newest first so display casing and tie-breaks
  // both follow the most recent use.
  const ordered = [...samples].sort((a, b) => (a.startUtc < b.startUtc ? 1 : -1))
  const groups = new Map<string, Group>()

  for (const sample of ordered) {
    const key = normalizeTitle(sample.title)
    if (!key) continue
    if (matchWeight(key, normalizedQuery) === 0) continue

    let group = groups.get(key)
    if (!group) {
      group = { display: sample.title.trim(), samples: [], uses: 0, lastUsedUtc: sample.startUtc }
      groups.set(key, group)
    }
    group.samples.push(sample)
    group.uses += estimateOccurrences(sample, windowStartUtc, nowUtc)
    const lastUsed = effectiveLastUsed(sample, nowUtc)
    if (lastUsed > group.lastUsedUtc) group.lastUsedUtc = lastUsed
  }

  const suggestions: TitleSuggestion[] = []

  for (const [key, group] of groups) {
    const weight = matchWeight(key, normalizedQuery)
    if (weight === 0 || group.uses === 0) continue

    const freq = Math.min(1, Math.log1p(group.uses) / Math.log1p(FREQ_SATURATION))

    const daysSince = Math.max(
      0,
      now.diff(DateTime.fromISO(group.lastUsedUtc, { zone: 'utc' }), 'days').days
    )
    const recency = Math.pow(0.5, daysSince / RECENCY_HALF_LIFE_DAYS)

    const timed = group.samples.filter((s) => !s.allDay)
    const allDayShare = (group.samples.length - timed.length) / group.samples.length

    let timeFit: number
    if (options.targetAllDay) {
      timeFit = allDayShare
    } else if (timed.length === 0) {
      timeFit = 0
    } else {
      // Best fit, not average: a title used at both 09:00 and 17:00 should score
      // full marks at either, and a circular mean of the two would say 13:00.
      const closest = Math.min(
        ...timed.map((s) => {
          const local = DateTime.fromISO(s.startUtc, { zone: 'utc' }).toLocal()
          return hourDistance(local.hour + local.minute / 60, targetHour)
        })
      )
      timeFit =
        (1 - allDayShare) * Math.exp(-(closest * closest) / (2 * HOUR_SIGMA * HOUR_SIGMA))
    }

    const onTargetDay = group.samples.filter(
      (s) => DateTime.fromISO(occurrenceDateKey(s.allDay, s.startUtc)).weekday === targetWeekday
    ).length
    // Floored rather than raw so a title that simply never lands on this weekday
    // is demoted, not eliminated.
    const dayFit = 0.2 + 0.8 * (onTargetDay / group.samples.length)

    const durations = timed.map((s) =>
      Math.round(
        DateTime.fromISO(s.endUtc, { zone: 'utc' }).diff(
          DateTime.fromISO(s.startUtc, { zone: 'utc' }),
          'minutes'
        ).minutes
      )
    )

    suggestions.push({
      title: group.display,
      calendarId: mostCommon(group.samples.map((s) => s.calendarId))!,
      uses: group.uses,
      lastUsedUtc: group.lastUsedUtc,
      durationMinutes: median(durations.filter((d) => d > 0)),
      allDay: allDayShare > 0.5,
      location: group.samples.find((s) => s.location)?.location ?? null,
      score:
        weight *
        (WEIGHTS.freq * freq +
          WEIGHTS.recency * recency +
          WEIGHTS.timeFit * timeFit +
          WEIGHTS.dayFit * dayFit)
    })
  }

  return suggestions
    .sort((a, b) => b.score - a.score || (a.title < b.title ? -1 : 1))
    .slice(0, limit)
}
