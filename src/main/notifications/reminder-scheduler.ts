import { Notification, BrowserWindow } from 'electron'
import { DateTime } from 'luxon'
import type { ISqliteDatabase } from '../db/sqlite-driver'
import { EventsRepo } from '../db/repos/events-repo'
import { CalendarsRepo } from '../db/repos/calendars-repo'
import { mt } from '../i18n-main'

/** How far ahead to expand occurrences; comfortably covers the trigger window. */
const LOOKAHEAD_MINUTES = 15
/** Fire when an event starts within this many minutes... */
const NOTIFY_LEAD_MINUTES = 10
/** ...and no more than this long after it has already started. */
const NOTIFY_GRACE_MINUTES = 1

export class ReminderScheduler {
  private eventsRepo: EventsRepo
  private calendarsRepo: CalendarsRepo
  private timer: NodeJS.Timeout | null = null
  /** Occurrence id -> its start, so entries can be dropped once they are past.
   *  A plain Set here only ever grew: this is a tray app that stays running for
   *  days, so every occurrence ever notified stayed resident for the session. */
  private notifiedOccurrences = new Map<string, number>()

  constructor(db: ISqliteDatabase) {
    this.eventsRepo = new EventsRepo(db)
    this.calendarsRepo = new CalendarsRepo(db)
  }

  /**
   * Start periodic scheduler check (every 1 minute)
   */
  start(intervalMs = 60 * 1000): void {
    if (this.timer) clearInterval(this.timer)

    // Run immediate check on start
    this.checkReminders()

    this.timer = setInterval(() => {
      this.checkReminders()
    }, intervalMs)
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  /**
   * Check for events starting in the next 10 minutes that haven't been alerted
   */
  checkReminders(): void {
    if (!Notification.isSupported()) {
      return
    }

    const nowUtc = DateTime.utc()
    // Only the next few minutes matter - the trigger window below is -1..+10min.
    // Expanding further just burns recurrence expansion on every tick.
    const lookaheadUtc = nowUtc.plus({ minutes: LOOKAHEAD_MINUTES })

    this.prunePastNotifications(nowUtc)

    const calendars = this.calendarsRepo.listCalendars()
    const activeCalIds = calendars.filter((c) => c.isVisible).map((c) => c.id)
    if (activeCalIds.length === 0) return

    const occurrences = this.eventsRepo.queryEventsByRange(
      activeCalIds,
      nowUtc.toISO()!,
      lookaheadUtc.toISO()!
    )

    for (const occ of occurrences) {
      if (occ.allDay) continue

      const occStart = DateTime.fromISO(occ.startUtc, { zone: 'utc' })
      const diffMinutes = occStart.diff(nowUtc, 'minutes').minutes

      // Trigger notification if event starts in 10 minutes or less (and hasn't started more than 1 min ago)
      if (diffMinutes <= NOTIFY_LEAD_MINUTES && diffMinutes >= -NOTIFY_GRACE_MINUTES) {
        if (!this.notifiedOccurrences.has(occ.id)) {
          this.notifiedOccurrences.set(occ.id, occStart.toMillis())
          this.showNotification(occ.title, occ.startUtc, occ.location)
        }
      }
    }
  }

  /** Forget occurrences that have started long enough ago that they can no
   *  longer re-enter the trigger window. */
  private prunePastNotifications(nowUtc: DateTime): void {
    const cutoff = nowUtc.minus({ minutes: NOTIFY_GRACE_MINUTES + 5 }).toMillis()
    for (const [id, startMs] of this.notifiedOccurrences) {
      if (startMs < cutoff) this.notifiedOccurrences.delete(id)
    }
  }

  /**
   * Show native OS notification
   */
  private showNotification(title: string, startUtc: string, location?: string): void {
    const localStart = DateTime.fromISO(startUtc, { zone: 'utc' }).setZone('local')
    const timeStr = localStart.toFormat('HH:mm')
    const body = `${timeStr}${location ? ` @ ${location}` : ''} — ${mt('notify.startsSoon')}`

    const notif = new Notification({
      title: mt('notify.reminder', { title }),
      body,
      silent: false
    })

    notif.on('click', () => {
      const windows = BrowserWindow.getAllWindows()
      if (windows.length > 0) {
        const win = windows[0]
        if (win.isMinimized()) win.restore()
        win.focus()
      }
    })

    notif.show()
  }
}
