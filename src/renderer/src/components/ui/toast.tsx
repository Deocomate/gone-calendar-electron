import React from 'react'
import { Toaster as SonnerToaster, toast } from 'sonner'
import { CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import i18n from '../../i18n'

export { toast }

/**
 * True when the failure is "the row you asked about is not there any more".
 *
 * Almost always means a background sync re-keyed the event between the view
 * rendering and the action firing: a first successful push replaces the local
 * `evt_...` id with the one the provider assigned. The right response is to
 * reload rather than to report a failure the user can do nothing about, so this
 * is a predicate for the call site instead of a branch in showFriendlyError.
 */
export function isStaleEventError(err: unknown): boolean {
  const raw = typeof err === 'string' ? err : (err as { message?: string })?.message || ''
  return /Event not found|Source event not found|Master event not found/i.test(raw)
}

/**
 * Format any backend/IPC error message into a human-friendly, localized notification.
 */
export function showFriendlyError(err: any, fallbackTitle?: string) {
  const raw = typeof err === 'string' ? err : err?.message || String(err || '')
  const clean = raw.replace(/^Error:\s*/, '').replace(/Error invoking remote method '[^']+':\s*(Error:\s*)?/g, '')

  if (
    clean.includes('Cannot modify events in read-only calendar') ||
    clean.includes('Move rejected: Cannot modify') ||
    clean.includes('read-only calendar')
  ) {
    toast.error(i18n.t('friendly.readOnlyTitle'), { description: i18n.t('friendly.readOnlyMove') })
    return
  }

  if (clean.includes('Cannot delete events in read-only calendar')) {
    toast.error(i18n.t('friendly.readOnlyTitle'), { description: i18n.t('friendly.readOnlyDelete') })
    return
  }

  if (clean.includes('RRULE') || clean.includes('recurrence')) {
    toast.error(i18n.t('friendly.rruleTitle'), { description: i18n.t('friendly.rruleBody') })
    return
  }

  const title = fallbackTitle || i18n.t('friendly.fallback')
  const description = clean || i18n.t('friendly.tryAgain')
  toast.error(title, { description, action: copyAction(`${title}\n${description}`) })
}

/**
 * A "Copy" button for a toast.
 *
 * The description on a failure is often the provider's own message, which is the
 * one thing worth pasting into a bug report or a search - and the app sets
 * `user-select: none` globally, so without this there is no way to get the text
 * out. Selecting it by hand works too; the toasts opt back into text selection.
 */
function copyAction(text: string): { label: string; onClick: () => void } {
  return {
    label: i18n.t('common.copy'),
    onClick: () => {
      void navigator.clipboard?.writeText(text)
    }
  }
}

/**
 * Notion-styled Toaster component
 */
export const NotionToaster: React.FC = () => {
  return (
    <SonnerToaster
      // Errors and warnings are the only toasts left, and both want to be read
      // rather than glanced at. Top centre is where the eye already is, and it
      // does not sit over the day's last hours the way bottom-right did.
      position="top-center"
      expand={false}
      richColors={false}
      closeButton={true}
      icons={{
        success: <CheckCircle2 className="h-4 w-4 text-accent shrink-0" />,
        error: <AlertCircle className="h-4 w-4 text-today shrink-0" />,
        warning: <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />,
        info: <Info className="h-4 w-4 text-accent shrink-0" />
      }}
      toastOptions={{
        style: {
          background: 'var(--color-bg-surface)',
          color: 'var(--color-text-main)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-dialog)',
          fontSize: '12px',
          boxShadow: '0 10px 28px rgba(0, 0, 0, 0.16), 0 0 0 1px var(--color-border)',
          padding: '10px 14px'
        },
        // The app disables text selection globally; a message worth copying has
        // to opt back in.
        className: 'font-sans select-text'
      }}
    />
  )
}

export default NotionToaster
