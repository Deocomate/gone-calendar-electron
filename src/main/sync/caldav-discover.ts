/**
 * CalDAV Discovery, URL Normalization, and XML Multistatus Parser
 */

export type CalDavProvider = 'nextcloud' | 'icloud' | 'synology' | 'generic'

export interface CalDavCalendarDescriptor {
  href: string
  displayName: string
  color?: string
  ctag?: string
  syncToken?: string
  isReadOnly?: boolean
}

/**
 * Normalize CalDAV server base URL based on provider preset
 */
export function normalizeCalDavUrl(
  provider: CalDavProvider,
  rawUrl?: string,
  username?: string
): string {
  if (provider === 'icloud') {
    return 'https://caldav.icloud.com'
  }

  let url = (rawUrl || '').trim()
  if (!url) {
    if (provider === 'nextcloud') return 'https://cloud.example.com/remote.php/dav'
    if (provider === 'synology') return 'https://synology.local:5001/caldav'
    return 'https://caldav.example.com'
  }

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`
  }

  // Remove trailing slashes
  url = url.replace(/\/+$/, '')

  if (provider === 'nextcloud') {
    if (!url.includes('/remote.php/dav') && !url.includes('/remote.php/caldav')) {
      url = `${url}/remote.php/dav`
    }
  } else if (provider === 'synology' && username) {
    if (!url.includes(`/caldav/${username}`) && !url.includes('/caldav')) {
      url = `${url}/caldav/${encodeURIComponent(username)}`
    }
  }

  return url
}

/**
 * Simple XML tag value extractor from XML multistatus response
 */
export function extractXmlTagValue(xml: string, tagName: string): string | undefined {
  // Support namespaced tags e.g. <D:displayname> or <displayname>
  const regex = new RegExp(`<(?:[a-zA-Z0-9_-]+:)?${tagName}(?:\\s+[^>]*)?>([\\s\\S]*?)<\\/(?:[a-zA-Z0-9_-]+:)?${tagName}>`, 'i')
  const match = xml.match(regex)
  return match ? match[1].trim() : undefined
}

/**
 * Parse CalDAV PROPFIND Multistatus XML into calendar descriptors
 */
export function parseCalDavMultistatus(xml: string, baseUrl: string): CalDavCalendarDescriptor[] {
  const responseRegex = /<(?:[a-zA-Z0-9_-]+:)?response(?:[\s\S]*?)<\/(?:[a-zA-Z0-9_-]+:)?response>/gi
  const responses = xml.match(responseRegex) || []
  const calendars: CalDavCalendarDescriptor[] = []

  for (const resp of responses) {
    const href = extractXmlTagValue(resp, 'href')
    if (!href) continue

    // Check if resource is a calendar (resourcetype has <calendar/>)
    const resourceType = extractXmlTagValue(resp, 'resourcetype') || ''
    const isCalendar = resourceType.toLowerCase().includes('calendar')

    if (!isCalendar) continue

    const displayName = extractXmlTagValue(resp, 'displayname') || 'CalDAV Calendar'
    const color = extractXmlTagValue(resp, 'calendar-color') || extractXmlTagValue(resp, 'color')
    const ctag = extractXmlTagValue(resp, 'getctag')
    const syncToken = extractXmlTagValue(resp, 'sync-token')

    // Check if calendar is read-only (<current-user-privilege-set> lacks <write/>)
    const privs = extractXmlTagValue(resp, 'current-user-privilege-set') || ''
    const isReadOnly = privs ? !privs.toLowerCase().includes('write') : false

    // Resolve full calendar URL
    let fullHref = href
    if (href.startsWith('/')) {
      try {
        const parsedBase = new URL(baseUrl)
        fullHref = `${parsedBase.origin}${href}`
      } catch {
        fullHref = href
      }
    }

    calendars.push({
      href: fullHref,
      displayName,
      color,
      ctag,
      syncToken,
      isReadOnly
    })
  }

  return calendars
}
