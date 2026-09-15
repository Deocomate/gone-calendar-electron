import { describe, it, expect } from 'vitest'
import { isSafeExternalUrl } from '../src/main/safe-external-url'

/**
 * Event titles, locations and meeting links arrive from synced providers, so a
 * URL reaching setWindowOpenHandler is not necessarily one the user typed.
 * shell.openExternal hands whatever it is to the OS's registered handler.
 */
describe('isSafeExternalUrl', () => {
  it('allows web and mail schemes', () => {
    expect(isSafeExternalUrl('https://meet.example.com/abc')).toBe(true)
    expect(isSafeExternalUrl('http://example.com')).toBe(true)
    expect(isSafeExternalUrl('mailto:someone@example.com')).toBe(true)
  })

  it('blocks schemes that reach the local machine or a shell', () => {
    expect(isSafeExternalUrl('file:///etc/passwd')).toBe(false)
    expect(isSafeExternalUrl('smb://server/share')).toBe(false)
    expect(isSafeExternalUrl('javascript:alert(1)')).toBe(false)
    expect(isSafeExternalUrl('vbscript:msgbox(1)')).toBe(false)
    expect(isSafeExternalUrl('ms-msdt:/id')).toBe(false)
  })

  it('blocks anything that is not a parseable URL', () => {
    expect(isSafeExternalUrl('')).toBe(false)
    expect(isSafeExternalUrl('not a url')).toBe(false)
    expect(isSafeExternalUrl('//example.com')).toBe(false)
  })
})
