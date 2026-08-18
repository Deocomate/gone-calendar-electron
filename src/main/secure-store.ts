import { safeStorage } from 'electron'
import type { ISqliteDatabase } from './db/sqlite-driver'

export class EncryptionUnavailableError extends Error {
  constructor() {
    super('OS Keyring encryption is unavailable. Please unlock your system keychain before storing credentials.')
    this.name = 'EncryptionUnavailableError'
  }
}

export class SecureStore {
  constructor(private db?: ISqliteDatabase) {}

  /**
   * Check if OS safeStorage encryption is available
   */
  isAvailable(): boolean {
    try {
      return typeof safeStorage?.isEncryptionAvailable === 'function' && safeStorage.isEncryptionAvailable()
    } catch {
      return false
    }
  }

  /**
   * Encrypt a string using OS credentials keyring (safeStorage)
   */
  encrypt(plaintext: string): string {
    if (!this.isAvailable()) {
      throw new EncryptionUnavailableError()
    }
    const buffer = safeStorage.encryptString(plaintext)
    return buffer.toString('base64')
  }

  /**
   * Decrypt a string using OS credentials keyring
   */
  decrypt(encryptedBase64: string): string {
    if (!this.isAvailable()) {
      throw new EncryptionUnavailableError()
    }
    const buffer = Buffer.from(encryptedBase64, 'base64')
    return safeStorage.decryptString(buffer)
  }

  /**
   * Store token for an account in SQLite encrypted
   */
  storeToken(accountId: string, tokenData: any): void {
    if (!this.db) {
      throw new Error('Database instance required to persist tokens')
    }
    const serialized = JSON.stringify(tokenData)
    const encrypted = this.encrypt(serialized)
    const now = new Date().toISOString()

    this.db
      .prepare(
        `INSERT INTO settings (key, value, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
      )
      .run(`token:${accountId}`, encrypted, now)
  }

  /**
   * Retrieve and decrypt token for an account
   */
  getToken<T = any>(accountId: string): T | null {
    if (!this.db) return null
    const row = this.db
      .prepare('SELECT value FROM settings WHERE key = ?')
      .get<{ value: string }>(`token:${accountId}`)

    if (!row || !row.value) return null
    try {
      const decrypted = this.decrypt(row.value)
      return JSON.parse(decrypted) as T
    } catch (err) {
      console.error(`Failed to decrypt token for account ${accountId}:`, err)
      return null
    }
  }

  /**
   * Remove stored token for an account
   */
  deleteToken(accountId: string): void {
    if (!this.db) return
    this.db.prepare('DELETE FROM settings WHERE key = ?').run(`token:${accountId}`)
  }
}
