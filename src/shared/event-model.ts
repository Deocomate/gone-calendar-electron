/**
 * Canonical Calendar, Event, Recurrence, and Sync Domain Models
 */

export type AccountType = 'local' | 'google' | 'graph' | 'caldav'

export interface CalendarAccount {
  id: string
  type: AccountType
  name: string
  email?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Calendar {
  id: string
  accountId: string
  name: string
  color: string
  isVisible: boolean
  isReadOnly: boolean
  isDefault: boolean
  syncToken?: string
  createdAt: string
  updatedAt: string
}

export type AttendeeResponseStatus = 'accepted' | 'declined' | 'tentative' | 'needsAction'

export interface Attendee {
  email: string
  displayName?: string
  responseStatus?: AttendeeResponseStatus
  isOrganizer?: boolean
}

/**
 * Compact spec for an anniversary that repeats on the same Vietnamese lunar
 * (âm lịch) date every year — e.g. a death anniversary (giỗ). Stored as JSON in
 * the `lunar_rule` column. An event carrying this never has an `rrule`; the
 * occurrence expander resolves one all-day instance per Gregorian year.
 */
export interface LunarRecurrenceSpec {
  day: number   // lunar day of month, 1-30
  month: number // lunar month, 1-12
  leap: boolean // true if the anniversary falls in a leap month
}

export interface CalendarEvent {
  id: string
  calendarId: string
  uid: string
  title: string
  notes?: string
  location?: string
  dtStartUtc: string // ISO 8601 UTC string (e.g. 2026-08-18T10:00:00.000Z) or YYYY-MM-DD for allDay
  dtEndUtc: string   // ISO 8601 UTC string or YYYY-MM-DD for allDay
  tzid: string       // e.g. "Asia/Ho_Chi_Minh", "UTC"
  allDay: boolean
  rrule?: string     // RFC 5545 RRULE string e.g. "FREQ=WEEKLY;BYDAY=MO,WE,FR"
  rdate?: string     // Comma-separated ISO strings
  exdate?: string    // Comma-separated ISO strings
  lunarRule?: LunarRecurrenceSpec       // Yearly lunar-date recurrence (mutually exclusive with rrule)
  lunarSourceEventId?: string           // Set on a materialized instance: the lunar master it came from
  color?: string     // Hex or theme color override
  meetingUrl?: string
  attendees?: Attendee[]
  etag?: string
  dirty: boolean
  /** A push to the provider hit a 412 (someone else changed it first) - unresolved until the user picks a side. */
  hasConflict?: boolean
  isDeleted: boolean
  createdAt: string
  updatedAt: string
}

/** One unresolved sync conflict, ready to show in a resolution list. */
export interface SyncConflict {
  eventId: string
  calendarId: string
  calendarName: string
  title: string
  updatedAt: string
}

export interface EventException {
  id: string
  masterEventId: string
  originalStartUtc: string // ISO 8601 UTC matching the occurrence instance start
  isCancelled: boolean
  title?: string
  notes?: string
  location?: string
  dtStartUtc?: string
  dtEndUtc?: string
  tzid?: string
  color?: string
  createdAt: string
  updatedAt: string
}

export interface ExpandedOccurrence {
  id: string               // Unique ID: `${eventId}_${originalStartUtc}`
  eventId: string          // Master event ID
  calendarId: string
  title: string
  notes?: string
  location?: string
  startUtc: string         // Effective start time in UTC ISO
  endUtc: string           // Effective end time in UTC ISO
  tzid: string
  allDay: boolean
  color?: string
  meetingUrl?: string
  isRecurring: boolean
  isException: boolean
  isLunar?: boolean        // True when produced by a yearly lunar-date master
  originalStartUtc: string // Original recurrence start in UTC ISO
}

export interface CreateEventInput {
  calendarId: string
  title: string
  notes?: string
  location?: string
  dtStartUtc: string
  dtEndUtc: string
  tzid?: string
  allDay?: boolean
  rrule?: string
  exdate?: string
  lunarRule?: LunarRecurrenceSpec | null
  lunarSourceEventId?: string
  color?: string
  meetingUrl?: string
  attendees?: Attendee[]
  uid?: string
}

export interface UpdateEventInput {
  title?: string
  notes?: string
  location?: string
  dtStartUtc?: string
  dtEndUtc?: string
  tzid?: string
  allDay?: boolean
  rrule?: string
  exdate?: string
  lunarRule?: LunarRecurrenceSpec | null
  color?: string
  meetingUrl?: string
  attendees?: Attendee[]
  isDeleted?: boolean
}

export interface MaterializeLunarInput {
  masterEventId: string
  targetCalendarId: string
  throughYear: number
}

export interface DetachLunarInput {
  masterEventId: string
}

export type RecurringEditScope = 'this' | 'future' | 'all'

export interface MoveEventInput {
  eventId: string
  dtStartUtc: string
  dtEndUtc: string
  targetCalendarId?: string
}

export interface CopyEventInput {
  sourceEventId: string
  dtStartUtc: string
  dtEndUtc: string
  targetCalendarId?: string
  copyInstanceOnly?: boolean
}

export interface UpdateRecurringScopeInput {
  masterEventId: string
  originalStartUtc: string
  scope: RecurringEditScope
  updateInput: UpdateEventInput
}

export interface DeleteRecurringScopeInput {
  masterEventId: string
  originalStartUtc: string
  scope: RecurringEditScope
}

export interface SyncStatus {
  lastSyncTime?: string
  isSyncing: boolean
  lastError?: string
  pendingPushesCount: number
  connectedAccounts: CalendarAccount[]
}

export interface SyncResult {
  success: boolean
  pulledCount: number
  pushedCount: number
  errorCount: number
  message?: string
}
