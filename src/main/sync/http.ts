/**
 * Network helpers shared by the sync engines, CalDAV adapter and OAuth managers.
 *
 * Node's global `fetch` has no default request timeout: a connection that opens
 * and then stalls (captive portal, flaky VPN, provider hiccup) never settles.
 * That is fatal here because SyncWorker guards re-entry with an `isSyncing`
 * flag - one hung request wedges the flag on and every later poll short-circuits
 * with "sync already in progress" until the app restarts. Every outbound request
 * therefore goes through this wrapper.
 */

/** Default per-request ceiling. Generous enough for a slow CalDAV REPORT. */
export const DEFAULT_REQUEST_TIMEOUT_MS = 30_000

export class RequestTimeoutError extends Error {
  constructor(url: string, timeoutMs: number) {
    super(`Request timed out after ${timeoutMs}ms: ${url}`)
    this.name = 'RequestTimeoutError'
  }
}

/**
 * `fetch` with a hard deadline. Any caller-supplied `signal` still works - the
 * two are combined, so an external abort and the timeout both cancel.
 */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  const external = init.signal
  const onExternalAbort = (): void => controller.abort()
  if (external) {
    if (external.aborted) controller.abort()
    else external.addEventListener('abort', onExternalAbort, { once: true })
  }

  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } catch (err: any) {
    // An abort raised by our own timer is reported as a timeout; an abort that
    // came from the caller's signal is left as-is.
    if (err?.name === 'AbortError' && !external?.aborted) {
      throw new RequestTimeoutError(url, timeoutMs)
    }
    throw err
  } finally {
    clearTimeout(timer)
    if (external) external.removeEventListener('abort', onExternalAbort)
  }
}

/**
 * Turn a non-OK response into something worth logging.
 *
 * A push that failed used to increment an error counter and nothing else - no
 * status, no body - so a provider rejecting every insert looked exactly like a
 * provider accepting every insert. Reading the body here is safe: the caller has
 * already decided the response failed and will not read it again.
 */
export async function describeHttpFailure(res: Response): Promise<string> {
  let body = ''
  try {
    body = (await res.text()).trim()
  } catch {
    // A body that cannot be read is not worth failing over; the status still says something.
  }
  if (body.length > 500) body = `${body.slice(0, 500)}…`
  return body ? `HTTP ${res.status} ${res.statusText}: ${body}` : `HTTP ${res.status} ${res.statusText}`
}
