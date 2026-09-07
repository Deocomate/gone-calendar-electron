import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { app } from 'electron'

/**
 * OAuth client credentials are not bundled with the app. In dev, electron-vite
 * injects them from a project `.env`. In a packaged build there is no such
 * mechanism, so we read a plain `KEY=VALUE` file from a few well-known locations
 * and copy anything not already in the environment.
 *
 * Recognized keys: GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET,
 * MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET.
 */
export function credentialsFilePath(): string {
  return join(app.getPath('userData'), 'gone-calendar.env')
}

export function loadCredentialsFile(): void {
  const candidates = [
    credentialsFilePath(),
    join(dirname(app.getPath('exe')), 'gone-calendar.env'),
    join(process.cwd(), '.env')
  ]

  for (const file of candidates) {
    if (!existsSync(file)) continue
    try {
      const text = readFileSync(file, 'utf8')
      for (const rawLine of text.split(/\r?\n/)) {
        const line = rawLine.trim()
        if (!line || line.startsWith('#')) continue
        const eq = line.indexOf('=')
        if (eq === -1) continue
        const key = line.slice(0, eq).trim()
        let value = line.slice(eq + 1).trim()
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1)
        }
        if (key && !process.env[key]) {
          process.env[key] = value
        }
      }
    } catch (err) {
      console.warn(`Failed to read credentials file ${file}:`, err)
    }
  }
}

const DUMMY_VALUES = new Set([
  '',
  'dummy_google_id.apps.googleusercontent.com',
  'dummy_microsoft_client_id'
])

export function isConfigured(clientId: string | undefined): boolean {
  return Boolean(clientId) && !DUMMY_VALUES.has(clientId as string)
}
