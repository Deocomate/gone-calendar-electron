import type { ExpandedOccurrence } from '@shared/event-model'
import { DEFAULT_EVENT_COLOR, NOTION_PASTEL_PALETTE } from '@shared/mini-calendar-grid'
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
}

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

  const processGroup = (currentGroup: typeof parsed) => {
    if (currentGroup.length === 0) return
    const columns: (typeof parsed)[] = []

    for (const item of currentGroup) {
      let placed = false
      for (let i = 0; i < columns.length; i++) {
        const lastInCol = columns[i][columns[i].length - 1]
        if (lastInCol.endMin <= item.startMin) {
          columns[i].push(item)
          placed = true
          break
        }
      }
      if (!placed) {
        columns.push([item])
      }
    }

    const colCount = columns.length
    const colorCounts = new Map<string, number>()
    for (const item of currentGroup) {
      const c = item.occ.color || DEFAULT_EVENT_COLOR
      colorCounts.set(c, (colorCounts.get(c) || 0) + 1)
    }

    for (let c = 0; c < colCount; c++) {
      for (const item of columns[c]) {
        const originalColor = item.occ.color || DEFAULT_EVENT_COLOR
        let finalColor = originalColor

        if (colCount > 1 && ((colorCounts.get(originalColor) || 0) > 1 || !item.occ.color)) {
          finalColor = NOTION_PASTEL_PALETTE[c % NOTION_PASTEL_PALETTE.length]
        }

        layouts.push({
          occ: item.occ,
          segment: item.segment,
          topPos: item.topPos,
          height: item.height,
          leftPercent: (c / colCount) * 100,
          widthPercent: 100 / colCount,
          overlapIndex: c,
          totalOverlaps: colCount,
          effectiveColor: finalColor
        })
      }
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
