import { describe, it, expect, vi } from 'vitest'
import { SecureStore, EncryptionUnavailableError } from '../src/main/secure-store'

describe('SecureStore Token Vault', () => {
  it('should throw EncryptionUnavailableError if safeStorage is unavailable (fail-closed)', () => {
    const store = new SecureStore()
    // Mock isAvailable -> false
    vi.spyOn(store, 'isAvailable').mockReturnValue(false)

    expect(() => store.encrypt('my-refresh-token')).toThrowError(EncryptionUnavailableError)
    expect(() => store.decrypt('some-ciphertext')).toThrowError(EncryptionUnavailableError)
  })
})
