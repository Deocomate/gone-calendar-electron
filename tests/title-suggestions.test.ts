import { describe, it, expect } from 'vitest'
import { DateTime, Settings } from 'luxon'
import {
  rankTitleSuggestions,
  estimateOccurrences,
  effectiveLastUsed,
  matchWeight,
  normalizeTitle,
  type TitleSample
} from '../src/shared/title-suggestions'

/**
 * The ranking exists to answer "what usually goes in this slot?", so almost
 * every test here fixes one signal and varies another. `now` is injected
 * because every one of them is relative to it.
 */
const NOW = DateTime.fromISO('2026-09-15T12:00:00.000Z', { zone: 'utc' })

function withZone<T>(zone: string, fn: () => T): T {
  const previous = Settings.defaultZone
  Settings.defaultZone = zone
  try {
    return fn()
  } finally {
    Settings.defaultZone = previous
  }
}

/** A timed sample on `date` at `hh:mm` local, an hour long unless told otherwise. */
function sample(overrides: Partial<TitleSample> & { title: string }): TitleSample {
  const start = overrides.startUtc ?? '2026-09-14T09:00:00.000Z'
  return {
    calendarId: 'cal-work',
    startUtc: start,
    endUtc:
      overrides.endUtc ??
      DateTime.fromISO(start, { zone: 'utc' }).plus({ hours: 1 }).toISO()!,
    allDay: false,
    location: null,
    rrule: null,
    ...overrides
  }
}

function rank(samples: TitleSample[], opts: Partial<Parameters<typeof rankTitleSuggestions>[1]> = {}) {
  return rankTitleSuggestions(samples, {
    query: '',
    targetStartUtc: '2026-09-15T09:00:00.000Z',
    targetAllDay: false,
    now: NOW,
    ...opts
  })
}

describe('normalizeTitle', () => {
  it('collapses case and runs of whitespace so near-identical titles group', () => {
    expect(normalizeTitle('  Team   Standup ')).toBe('team standup')
    expect(normalizeTitle('TEAM STANDUP')).toBe(normalizeTitle('team standup'))
  })
})

describe('matchWeight', () => {
  it('accepts everything when nothing has been typed yet', () => {
    expect(matchWeight('anything at all', '')).toBe(1)
  })

  it('ranks a whole-string prefix above a word prefix above an interior match', () => {
    const wholePrefix = matchWeight('standup with design', 'stand')
    const wordPrefix = matchWeight('design standup', 'stand')
    const interior = matchWeight('understanding tests', 'stand')

    expect(wholePrefix).toBeGreaterThan(wordPrefix)
    expect(wordPrefix).toBeGreaterThan(interior)
    expect(interior).toBeGreaterThan(0)
  })

  it('rejects a title that is missing any token of a multi-word query', () => {
    expect(matchWeight('team standup', 'team stand')).toBeGreaterThan(0)
    expect(matchWeight('team standup', 'team retro')).toBe(0)
  })

  it('takes the weakest token as the tier, so one loose token demotes the match', () => {
    // "team" is a word prefix (0.75), "andup" is only interior (0.35).
    expect(matchWeight('team standup', 'team andup')).toBe(0.35)
  })
})

describe('estimateOccurrences', () => {
  const windowStart = '2025-09-15T00:00:00.000Z'
  const now = '2026-09-15T00:00:00.000Z'

  it('counts a one-off event once', () => {
    expect(estimateOccurrences({ rrule: null, startUtc: '2026-09-01T09:00:00.000Z' }, windowStart, now)).toBe(1)
  })

  it('counts a weekly series roughly once a week across the window', () => {
    const n = estimateOccurrences(
      { rrule: 'FREQ=WEEKLY;BYDAY=MO', startUtc: '2023-01-02T09:00:00.000Z' },
      windowStart,
      now
    )
    expect(n).toBeGreaterThan(45)
    expect(n).toBeLessThan(56)
  })

  it('multiplies a weekly series by the number of days it fires on', () => {
    const once = estimateOccurrences(
      { rrule: 'FREQ=WEEKLY;BYDAY=MO', startUtc: '2023-01-02T09:00:00.000Z' },
      windowStart,
      now
    )
    const thrice = estimateOccurrences(
      { rrule: 'FREQ=WEEKLY;BYDAY=MO,WE,FR', startUtc: '2023-01-02T09:00:00.000Z' },
      windowStart,
      now
    )
    expect(thrice).toBeGreaterThan(once * 2.5)
  })

  it('halves for INTERVAL=2', () => {
    const weekly = estimateOccurrences({ rrule: 'FREQ=WEEKLY', startUtc: '2023-01-02T09:00:00.000Z' }, windowStart, now)
    const fortnightly = estimateOccurrences(
      { rrule: 'FREQ=WEEKLY;INTERVAL=2', startUtc: '2023-01-02T09:00:00.000Z' },
      windowStart,
      now
    )
    expect(fortnightly).toBeCloseTo(weekly / 2, -0.5)
  })

  it('never exceeds an explicit COUNT', () => {
    expect(
      estimateOccurrences(
        { rrule: 'FREQ=DAILY;COUNT=5', startUtc: '2026-01-01T09:00:00.000Z' },
        windowStart,
        now
      )
    ).toBe(5)
  })

  it('stops counting a series that ended, in RFC 5545 compact form', () => {
    // Ran for about a month inside the window, then stopped.
    const n = estimateOccurrences(
      { rrule: 'FREQ=DAILY;UNTIL=20251015T090000Z', startUtc: '2025-09-15T09:00:00.000Z' },
      windowStart,
      now
    )
    expect(n).toBeGreaterThan(25)
    expect(n).toBeLessThan(35)
  })

  it('counts nothing for a series that finished before the window opened', () => {
    expect(
      estimateOccurrences(
        { rrule: 'FREQ=DAILY;UNTIL=20200101T090000Z', startUtc: '2019-01-01T09:00:00.000Z' },
        windowStart,
        now
      )
    ).toBe(0)
  })

  it('treats an unparseable rule as a single event rather than throwing', () => {
    expect(estimateOccurrences({ rrule: 'NONSENSE', startUtc: '2026-09-01T09:00:00.000Z' }, windowStart, now)).toBe(1)
  })
})

describe('effectiveLastUsed', () => {
  const now = '2026-09-15T12:00:00.000Z'

  it('uses the start for a one-off event', () => {
    expect(effectiveLastUsed({ rrule: null, startUtc: '2026-03-01T09:00:00.000Z' }, now)).toBe(
      '2026-03-01T09:00:00.000Z'
    )
  })

  it('treats a still-running series as current, not as old as its first occurrence', () => {
    // A standup set up in 2023 and still running is not two and a half years
    // stale - scoring it on dtstart would bury the most-used title in the list.
    expect(effectiveLastUsed({ rrule: 'FREQ=WEEKLY', startUtc: '2023-01-02T09:00:00.000Z' }, now)).toBe(now)
  })

  it('uses UNTIL for a series that has finished', () => {
    expect(
      effectiveLastUsed({ rrule: 'FREQ=WEEKLY;UNTIL=20260401T090000Z', startUtc: '2023-01-02T09:00:00.000Z' }, now)
    ).toBe('2026-04-01T09:00:00.000Z')
  })
})

describe('rankTitleSuggestions', () => {
  it('returns nothing when there is no history', () => {
    expect(rank([])).toEqual([])
  })

  it('suggests without a query at all, which is the "what goes here?" case', () => {
    const out = rank([sample({ title: 'Standup' }), sample({ title: 'Retro' })])
    expect(out.map((s) => s.title).sort()).toEqual(['Retro', 'Standup'])
  })

  it('drops titles that do not match what has been typed', () => {
    const out = rank([sample({ title: 'Standup' }), sample({ title: 'Retro' })], { query: 'ret' })
    expect(out.map((s) => s.title)).toEqual(['Retro'])
  })

  it('groups differing case and spacing into one suggestion, showing the newest casing', () => {
    const out = rank([
      sample({ title: 'Team Standup', startUtc: '2026-09-14T09:00:00.000Z' }),
      sample({ title: 'team  standup', startUtc: '2026-09-07T09:00:00.000Z' }),
      sample({ title: 'TEAM STANDUP', startUtc: '2026-08-31T09:00:00.000Z' })
    ])

    expect(out).toHaveLength(1)
    expect(out[0].title).toBe('Team Standup')
    expect(out[0].uses).toBe(3)
  })

  it('ranks a title used often above one used once, all else equal', () => {
    const often = [0, 7, 14, 21].map((d) =>
      sample({ title: 'Standup', startUtc: DateTime.fromISO('2026-09-14T09:00:00.000Z').minus({ days: d }).toISO()! })
    )
    const out = rank([...often, sample({ title: 'Retro' })])
    expect(out[0].title).toBe('Standup')
  })

  it('counts a recurring series by its occurrences, not as a single row', () => {
    // The whole point: one weekly row must outrank three one-off rows, because
    // in lived terms it happened fifty times and they happened three.
    const out = rank([
      sample({ title: 'Weekly sync', rrule: 'FREQ=WEEKLY', startUtc: '2025-01-06T09:00:00.000Z' }),
      sample({ title: 'Ad hoc', startUtc: '2026-09-14T09:00:00.000Z' }),
      sample({ title: 'Ad hoc', startUtc: '2026-09-13T09:00:00.000Z' }),
      sample({ title: 'Ad hoc', startUtc: '2026-09-12T09:00:00.000Z' })
    ])
    expect(out[0].title).toBe('Weekly sync')
    expect(out[0].uses).toBeGreaterThan(40)
  })

  it('ranks a recently used title above a long-stale one of equal frequency', () => {
    const out = rank([
      sample({ title: 'Fresh', startUtc: '2026-09-13T09:00:00.000Z' }),
      sample({ title: 'Stale', startUtc: '2025-11-01T09:00:00.000Z' })
    ])
    expect(out[0].title).toBe('Fresh')
  })

  it('prefers the title that usually happens at the hour being filled', () => {
    const out = rank(
      [
        sample({ title: 'Morning standup', startUtc: '2026-09-14T09:00:00.000Z' }),
        sample({ title: 'Evening gym', startUtc: '2026-09-14T18:00:00.000Z' })
      ],
      { targetStartUtc: '2026-09-15T18:15:00.000Z' }
    )
    expect(out[0].title).toBe('Evening gym')
  })

  it('scores a title used at two different hours well at either of them', () => {
    // A best-fit, not an average: the mean of 09:00 and 17:00 is 13:00, which is
    // the one time this title never happens.
    const twice = [
      sample({ title: 'Clinic', startUtc: '2026-09-14T09:00:00.000Z' }),
      sample({ title: 'Clinic', startUtc: '2026-09-12T17:00:00.000Z' })
    ]
    const atNine = rank(twice, { targetStartUtc: '2026-09-15T09:00:00.000Z' })[0]
    const atFive = rank(twice, { targetStartUtc: '2026-09-15T17:00:00.000Z' })[0]
    const atOne = rank(twice, { targetStartUtc: '2026-09-15T13:00:00.000Z' })[0]

    expect(atNine.score).toBeCloseTo(atFive.score, 5)
    expect(atOne.score).toBeLessThan(atNine.score)
  })

  it('prefers the title that usually lands on the weekday being filled', () => {
    // 2026-09-15 is a Tuesday. Both titles are equally frequent and equally
    // recent; only the weekday separates them.
    const out = rank(
      [
        // Tuesdays
        sample({ title: 'Tuesday review', startUtc: '2026-09-08T09:00:00.000Z' }),
        sample({ title: 'Tuesday review', startUtc: '2026-09-01T09:00:00.000Z' }),
        // Saturdays
        sample({ title: 'Saturday errands', startUtc: '2026-09-12T09:00:00.000Z' }),
        sample({ title: 'Saturday errands', startUtc: '2026-09-05T09:00:00.000Z' })
      ],
      { targetStartUtc: '2026-09-15T09:00:00.000Z' }
    )
    expect(out[0].title).toBe('Tuesday review')
  })

  it('prefers all-day history when the slot being filled is all-day', () => {
    const out = rank(
      [
        sample({ title: 'Timed thing', startUtc: '2026-09-14T09:00:00.000Z' }),
        sample({
          title: 'Day off',
          startUtc: '2026-09-14T00:00:00.000Z',
          endUtc: '2026-09-14T00:00:00.000Z',
          allDay: true
        })
      ],
      { targetStartUtc: '2026-09-15T00:00:00.000Z', targetAllDay: true }
    )
    expect(out[0].title).toBe('Day off')
  })

  it('carries the calendar the title is most often filed under', () => {
    const out = rank([
      sample({ title: 'Standup', calendarId: 'cal-work', startUtc: '2026-09-14T09:00:00.000Z' }),
      sample({ title: 'Standup', calendarId: 'cal-work', startUtc: '2026-09-07T09:00:00.000Z' }),
      sample({ title: 'Standup', calendarId: 'cal-personal', startUtc: '2026-09-01T09:00:00.000Z' })
    ])
    expect(out[0].calendarId).toBe('cal-work')
  })

  it('breaks a calendar tie toward the most recent use', () => {
    const out = rank([
      sample({ title: 'Gym', calendarId: 'cal-new', startUtc: '2026-09-14T09:00:00.000Z' }),
      sample({ title: 'Gym', calendarId: 'cal-old', startUtc: '2026-08-01T09:00:00.000Z' })
    ])
    expect(out[0].calendarId).toBe('cal-new')
  })

  it('reports the median length of the timed occurrences', () => {
    const out = rank([
      sample({ title: 'Call', startUtc: '2026-09-14T09:00:00.000Z', endUtc: '2026-09-14T09:30:00.000Z' }),
      sample({ title: 'Call', startUtc: '2026-09-13T09:00:00.000Z', endUtc: '2026-09-13T10:00:00.000Z' }),
      sample({ title: 'Call', startUtc: '2026-09-12T09:00:00.000Z', endUtc: '2026-09-12T09:30:00.000Z' })
    ])
    expect(out[0].durationMinutes).toBe(30)
  })

  it('honours the limit', () => {
    const many = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((title) => sample({ title }))
    expect(rank(many, { limit: 3 })).toHaveLength(3)
  })

  it('ignores blank titles instead of offering an empty row', () => {
    expect(rank([sample({ title: '   ' })])).toEqual([])
  })

  it('puts a prefix match ahead of an interior one even when the interior is more frequent', () => {
    const out = rank(
      [
        sample({ title: 'Standup', startUtc: '2026-09-14T09:00:00.000Z' }),
        ...[0, 1, 2, 3, 4].map((d) =>
          sample({
            title: 'Understanding the roadmap',
            startUtc: DateTime.fromISO('2026-09-14T09:00:00.000Z').minus({ days: d }).toISO()!
          })
        )
      ],
      { query: 'stand' }
    )
    expect(out[0].title).toBe('Standup')
  })

  it('prefers the title that usually happens at this hour, regardless of the machine zone', () => {
    // Sample and target are both built from local wall times, so they shift
    // together and the fit is the same everywhere. Asserting it in four zones is
    // what proves that, rather than assuming it.
    for (const zone of ['UTC', 'Australia/Sydney', 'Asia/Ho_Chi_Minh', 'America/Los_Angeles']) {
      withZone(zone, () => {
        const out = rankTitleSuggestions(
          [
            sample({ title: 'Breakfast', startUtc: DateTime.fromISO('2026-09-14T08:00', { zone }).toUTC().toISO()! }),
            sample({ title: 'Dinner', startUtc: DateTime.fromISO('2026-09-14T20:00', { zone }).toUTC().toISO()! })
          ],
          {
            query: '',
            targetStartUtc: DateTime.fromISO('2026-09-15T20:00', { zone }).toUTC().toISO()!,
            targetAllDay: false,
            now: NOW
          }
        )
        expect(out[0].title, zone).toBe('Dinner')
      })
    }
  })

  it('scores all-day history identically in every zone', () => {
    // All-day events are floating dates stored at midnight UTC. Reading their
    // weekday by converting to local time lands a day early west of GMT - the
    // same mistake that once made every Sunday event vanish - and would show up
    // here as Los Angeles disagreeing with UTC about the day fit.
    const samples = [
      sample({
        title: 'Tuesday holiday',
        startUtc: '2026-09-01T00:00:00.000Z',
        endUtc: '2026-09-01T00:00:00.000Z',
        allDay: true
      }),
      sample({
        title: 'Wednesday holiday',
        startUtc: '2026-09-02T00:00:00.000Z',
        endUtc: '2026-09-02T00:00:00.000Z',
        allDay: true
      })
    ]
    const options = {
      query: 'holiday',
      // 2026-09-22 is a Tuesday.
      targetStartUtc: '2026-09-22T00:00:00.000Z',
      targetAllDay: true,
      now: NOW
    }

    const baseline = withZone('UTC', () => rankTitleSuggestions(samples, options))
    expect(baseline[0].title).toBe('Tuesday holiday')

    for (const zone of ['Australia/Sydney', 'Asia/Ho_Chi_Minh', 'America/Los_Angeles']) {
      const out = withZone(zone, () => rankTitleSuggestions(samples, options))
      expect(out.map((s) => [s.title, s.score]), zone).toEqual(
        baseline.map((s) => [s.title, s.score])
      )
    }
  })
})
