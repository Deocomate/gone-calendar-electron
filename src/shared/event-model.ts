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
  color?: string     // Hex or theme color override
  meetingUrl?: string
  etag?: string
  dirty: boolean
  isDeleted: boolean
  createdAt: string
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
  color?: string
  meetingUrl?: string
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
  color?: string
  meetingUrl?: string
  isDeleted?: boolean
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
