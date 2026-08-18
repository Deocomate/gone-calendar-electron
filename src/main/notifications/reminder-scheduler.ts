import { Notification, BrowserWindow } from 'electron'
import { DateTime } from 'luxon'
import type { ISqliteDatabase } from '../db/sqlite-driver'
import { EventsRepo } from '../db/repos/events-repo'
import { CalendarsRepo } from '../db/repos/calendars-repo'

export class ReminderScheduler {
  private eventsRepo: EventsRepo
  private calendarsRepo: CalendarsRepo
  private timer: NodeJS.Timeout | null = null
  private notifiedOccurrences = new Set<string>()

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
    const lookaheadUtc = nowUtc.plus({ hours: 24 })

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
      if (diffMinutes <= 10 && diffMinutes >= -1) {
        if (!this.notifiedOccurrences.has(occ.id)) {
          this.notifiedOccurrences.add(occ.id)
          this.showNotification(occ.title, occ.startUtc, occ.location)
        }
      }
    }
  }

  /**
   * Show native OS notification
   */
  private showNotification(title: string, startUtc: string, location?: string): void {
    const localStart = DateTime.fromISO(startUtc, { zone: 'utc' }).setZone('local')
    const timeStr = localStart.toFormat('HH:mm')
    const body = `${timeStr}${location ? ` @ ${location}` : ''} — Bắt đầu trong ít phút`

    const notif = new Notification({
      title: `Nhắc nhở: ${title}`,
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
