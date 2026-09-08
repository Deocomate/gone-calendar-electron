import React from 'react'
import { Toaster as SonnerToaster, toast } from 'sonner'
import { CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import i18n from '../../i18n'

export { toast }

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

  toast.error(fallbackTitle || i18n.t('friendly.fallback'), {
    description: clean || i18n.t('friendly.tryAgain')
  })
}

/**
 * Notion-styled Toaster component
 */
export const NotionToaster: React.FC = () => {
  return (
    <SonnerToaster
      position="bottom-right"
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
        className: 'font-sans'
      }}
    />
  )
}

export default NotionToaster
