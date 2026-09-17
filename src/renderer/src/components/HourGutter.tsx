import React from 'react'
import { DateTime } from 'luxon'
import { formatClockTime } from '@shared/time-format'
import { useDisplayPreferences } from '../context/DisplayPreferencesContext'

interface HourGutterProps {
  hours: number[]
  hourHeight: number
  /** Day the labels are computed from - only its date matters. */
  referenceDay: DateTime
  /** Day view uses slightly roomier type than the denser week grid. */
  dense?: boolean
}

/**
 * The hour labels down the left edge of the Day/Week grids.
 *
 * A secondary timezone used to occupy its own grid column beside this one,
 * which cost ~56px of horizontal space, put a divider line between two sets of
 * numbers, and squeezed the day columns. Both zones now share a single column:
 * the local hour reads normally, with the secondary zone tucked underneath in
 * smaller muted type - so turning it on changes the gutter's content, not the
 * grid's shape.
 */
export const HourGutter: React.FC<HourGutterProps> = ({
  hours,
  hourHeight,
  referenceDay,
  dense = false
}) => {
  const { secondaryTimezone, timeFormat } = useDisplayPreferences()
  const startOfDay = referenceDay.startOf('day')

  return (
    <div className="bg-app pr-2 text-right select-none min-w-0">
      {hours.map((hour) => {
        // set(), not plus(): on the day a zone springs forward, adding hours
        // skips one and every label below it reads an hour late - taking the
        // secondary clock with it, since that converts from this instant.
        const local = startOfDay.set({ hour, minute: 0, second: 0, millisecond: 0 })
        const primary = formatClockTime(local, timeFormat)
        const secondary = secondaryTimezone
          ? formatClockTime(local.setZone(secondaryTimezone), timeFormat)
          : null

        return (
          <div
            key={hour}
            style={{ height: `${hourHeight}px` }}
            className={`flex flex-col items-end leading-none ${
              // The first label sits below the grid line; the rest straddle it,
              // which is what lines the number up with its own hour rule.
              hour === 0 ? 'pt-1' : '-translate-y-2'
            }`}
          >
            {/* The hour ruler is a primary reading aid, so it sits at full text
                colour rather than the muted grey used for secondary chrome. */}
            <span
              className={`font-medium font-mono tabular-nums text-primary/85 truncate ${
                dense ? 'text-xs' : 'text-[11px]'
              }`}
            >
              {primary}
            </span>
            {secondary && (
              <span className="mt-0.5 font-mono tabular-nums text-[9px] text-muted/60 truncate">
                {secondary}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default HourGutter
