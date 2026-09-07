import type { ExpandedOccurrence } from '@shared/event-model'
import { DEFAULT_EVENT_COLOR } from '@shared/mini-calendar-grid'
import type { TimedSegment } from '@shared/timed-event-segments'
import { segmentDayMinutes } from '@shared/timed-event-segments'

export interface TimedLayout {
  occ: ExpandedOccurrence
  segment: TimedSegment
  topPos: number
  height: number
  leftPercent: number
  widthPercent: number
  overlapIndex: number
  totalOverlaps: number
  effectiveColor: string
  /** Time range sits entirely inside a longer event's range - rendered as an inset
   *  card over that event instead of splitting both into narrower side-by-side columns. */
  isNested: boolean
  /** % of this card's OWN box width its title/time text may use - the rest is left
   *  clear for a nested child riding on top of it, so neither card's text is hidden. */
  contentWidthPercent: number
}

// Events never fill the full column width - a fixed strip stays uncovered on the
// right so the day column underneath is always clickable to start a new event,
// even at a time that's already fully booked. Matches Google Calendar.
const MAX_COLUMN_WIDTH_PERCENT = 92

export function layoutTimedSegments(segments: TimedSegment[], hourHeight: number): TimedLayout[] {
  if (segments.length === 0) return []

  const parsed = segments.map((segment) => {
    const { startMin, endMin } = segmentDayMinutes(segment)
    const durationMin = Math.max(15, endMin - startMin)
    return {
      occ: segment.occ,
      segment,
      startMin,
      endMin: startMin + durationMin,
      durationMin,
      topPos: (startMin / 60) * hourHeight,
      height: (durationMin / 60) * hourHeight
    }
  })

  parsed.sort((a, b) => a.startMin - b.startMin || b.durationMin - a.durationMin)

  const layouts: TimedLayout[] = []
  let group: typeof parsed = []
  let groupEndMin = 0

  const overlaps = (a: (typeof parsed)[number], b: (typeof parsed)[number]): boolean =>
    a.startMin < b.endMin && b.startMin < a.endMin

  const processGroup = (currentGroup: typeof parsed) => {
    if (currentGroup.length === 0) return
    type Item = (typeof currentGroup)[number]

    // An event whose time range sits entirely inside a longer event's range nests as
    // an inset card over it, instead of splitting both into narrower side-by-side
    // columns - a genuine partial overlap (neither contains the other) still splits.
    const parentOf = new Map<Item, Item>()
    for (const b of currentGroup) {
      let parent: Item | null = null
      for (const a of currentGroup) {
        if (a === b) continue
        const contains = a.startMin <= b.startMin && b.endMin <= a.endMin && a.durationMin > b.durationMin
        if (contains && (!parent || a.durationMin < parent.durationMin)) parent = a
      }
      if (parent) parentOf.set(b, parent)
    }

    const topLevel = currentGroup.filter((item) => !parentOf.has(item))
    const nested = currentGroup.filter((item) => parentOf.has(item))

    const resolveRoot = (item: Item): Item => {
      let root = parentOf.get(item)!
      while (parentOf.has(root)) root = parentOf.get(root)!
      return root
    }

    // Roots carrying a nested child give up half their own box to it, so both cards
    // keep a legible strip for their own title/time instead of one hiding the other.
    const NEST_SPLIT_PERCENT = 50
    const hostsWithNested = new Set<Item>()
    for (const item of nested) hostsWithNested.add(resolveRoot(item))

    const columns: Item[][] = []
    const colIndexByItem = new Map<Item, number>()

    for (const item of topLevel) {
      let placed = false
      for (let i = 0; i < columns.length; i++) {
        const lastInCol = columns[i][columns[i].length - 1]
        if (lastInCol.endMin <= item.startMin) {
          columns[i].push(item)
          colIndexByItem.set(item, i)
          placed = true
          break
        }
      }
      if (!placed) {
        colIndexByItem.set(item, columns.length)
        columns.push([item])
      }
    }

    const colCount = columns.length || 1
    const colWidth = MAX_COLUMN_WIDTH_PERCENT / colCount
    const layoutByItem = new Map<Item, { leftPercent: number; widthPercent: number }>()

    for (const item of topLevel) {
      const colIndex = colIndexByItem.get(item)!

      // Google Calendar-style expansion: widen the event across any columns to its
      // right that hold nothing overlapping it, instead of a fixed 1/colCount width.
      let spanCols = 1
      for (let c = colIndex + 1; c < colCount; c++) {
        const collides = columns[c].some((other) => overlaps(item, other))
        if (collides) break
        spanCols++
      }

      const itemLayout = { leftPercent: colIndex * colWidth, widthPercent: spanCols * colWidth }
      layoutByItem.set(item, itemLayout)
      layouts.push({
        occ: item.occ,
        segment: item.segment,
        topPos: item.topPos,
        height: item.height,
        leftPercent: itemLayout.leftPercent,
        widthPercent: itemLayout.widthPercent,
        overlapIndex: colIndex,
        totalOverlaps: colCount,
        effectiveColor: item.occ.color || DEFAULT_EVENT_COLOR,
        isNested: false,
        contentWidthPercent: hostsWithNested.has(item) ? 100 - NEST_SPLIT_PERCENT : 100
      })
    }

    // Each nested item takes the right half of whichever top-level box its
    // containment chain resolves to - right edges stay flush (no extra gutter),
    // while the host's own content was already confined to its left half above.
    for (const item of nested) {
      const root = resolveRoot(item)
      const rootLayout = layoutByItem.get(root) || { leftPercent: 0, widthPercent: MAX_COLUMN_WIDTH_PERCENT }
      const childWidth = rootLayout.widthPercent * (NEST_SPLIT_PERCENT / 100)

      layouts.push({
        occ: item.occ,
        segment: item.segment,
        topPos: item.topPos,
        height: item.height,
        leftPercent: rootLayout.leftPercent + rootLayout.widthPercent - childWidth,
        widthPercent: childWidth,
        overlapIndex: 0,
        totalOverlaps: 1,
        effectiveColor: item.occ.color || DEFAULT_EVENT_COLOR,
        isNested: true,
        contentWidthPercent: 100
      })
    }
  }

  for (const item of parsed) {
    if (group.length === 0) {
      group.push(item)
      groupEndMin = item.endMin
    } else if (item.startMin < groupEndMin) {
      group.push(item)
      groupEndMin = Math.max(groupEndMin, item.endMin)
    } else {
      processGroup(group)
      group = [item]
      groupEndMin = item.endMin
    }
  }
  processGroup(group)

  return layouts
}
