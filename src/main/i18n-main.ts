/**
 * Minimal main-process localization for the handful of user-visible strings that
 * live outside the renderer: the tray menu, OAuth callback pages, notifications
 * and sync status text. The renderer owns the full i18next catalog.
 */
import { getDatabase } from './db/database'

export type MainLocale = 'en' | 'vi'

let currentLocale: MainLocale = 'en'

const STRINGS: Record<MainLocale, Record<string, string>> = {
  en: {
    'tray.openMain': 'Open Gone Calendar',
    'tray.miniWindow': 'Mini window (upcoming events)',
    'tray.quit': 'Quit',
    'notify.reminder': 'Reminder: {title}',
    'notify.startsSoon': 'Starts in a few minutes',
    'sync.done': 'Sync complete: pulled {pulled}, pushed {pushed}',
    'oauth.google.success': 'Google Calendar connected!',
    'oauth.microsoft.success': 'Microsoft Outlook / 365 connected!',
    'oauth.account': 'Account: {detail}',
    'oauth.canClose': 'You can close this browser tab and return to Gone Calendar.',
    'oauth.stateError': 'Authentication error: invalid state or code',
    'oauth.google.failed': 'Google sign-in failed: {error}',
    'oauth.microsoft.failed': 'Microsoft sign-in failed: {error}',
    'oauth.canCloseShort': 'You can close this tab.',
    'oauth.timeout.google': 'Google authentication timed out (5 minutes). Please try again.',
    'oauth.timeout.microsoft': 'Microsoft authentication timed out (5 minutes). Please try again.'
  },
  vi: {
    'tray.openMain': 'Mở Gone Calendar',
    'tray.miniWindow': 'Cửa sổ Mini (sự kiện sắp tới)',
    'tray.quit': 'Thoát',
    'notify.reminder': 'Nhắc nhở: {title}',
    'notify.startsSoon': 'Bắt đầu trong ít phút',
    'sync.done': 'Đồng bộ hoàn tất: đã tải {pulled}, đã đẩy {pushed}',
    'oauth.google.success': 'Kết nối Google Calendar thành công!',
    'oauth.microsoft.success': 'Kết nối Microsoft Outlook / 365 thành công!',
    'oauth.account': 'Tài khoản: {detail}',
    'oauth.canClose': 'Bạn có thể đóng tab trình duyệt này và quay lại ứng dụng Gone Calendar.',
    'oauth.stateError': 'Lỗi xác thực: State hoặc Code không hợp lệ',
    'oauth.google.failed': 'Đăng nhập Google thất bại: {error}',
    'oauth.microsoft.failed': 'Đăng nhập Microsoft thất bại: {error}',
    'oauth.canCloseShort': 'Bạn có thể đóng tab này.',
    'oauth.timeout.google': 'Quá thời gian xác thực Google (5 phút). Vui lòng thử lại.',
    'oauth.timeout.microsoft': 'Quá thời gian xác thực Microsoft (5 phút). Vui lòng thử lại.'
  }
}

export function setMainLocale(locale: string): void {
  if (locale === 'en' || locale === 'vi') currentLocale = locale
}

export function getMainLocale(): MainLocale {
  return currentLocale
}

/** Load the persisted locale from the settings table (call once after DB init). */
export function loadMainLocaleFromDb(): void {
  try {
    const row = getDatabase()
      .prepare('SELECT value FROM settings WHERE key = ?')
      .get<{ value: string }>('locale')
    if (row) {
      const parsed = JSON.parse(row.value)
      if (parsed === 'en' || parsed === 'vi') currentLocale = parsed
    }
  } catch {
    // keep default
  }
}

export function mt(key: string, vars?: Record<string, string | number>): string {
  let s = STRINGS[currentLocale][key] ?? STRINGS.en[key] ?? key
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
    }
  }
  return s
}
