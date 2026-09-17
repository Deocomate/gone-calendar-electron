/**
 * Scheme allowlist for URLs handed to the OS via `shell.openExternal`.
 *
 * Event titles, locations and meeting links arrive from synced providers, so a
 * URL reaching the window-open handler is not necessarily one the user typed,
 * and openExternal will launch whatever handler is registered for a scheme -
 * including file:, smb: and OS-specific ones.
 *
 * Kept in its own module so it can be unit-tested without importing (and thus
 * executing) the app bootstrap in src/main/index.ts.
 */
const ALLOWED_EXTERNAL_PROTOCOLS = new Set(['https:', 'http:', 'mailto:'])

export function isSafeExternalUrl(rawUrl: string): boolean {
  try {
    return ALLOWED_EXTERNAL_PROTOCOLS.has(new URL(rawUrl).protocol)
  } catch {
    // Not parseable as a URL at all - never forward it.
    return false
  }
}
