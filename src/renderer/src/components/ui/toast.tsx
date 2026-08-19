import React from 'react'
import { Toaster as SonnerToaster, toast } from 'sonner'
import { CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react'

export { toast }

/**
 * Format any backend/IPC error message into a human-friendly Vietnamese notification.
 */
export function showFriendlyError(err: any, fallbackTitle = 'Có lỗi xảy ra') {
  const raw = typeof err === 'string' ? err : err?.message || String(err || '')
  const clean = raw.replace(/^Error:\s*/, '').replace(/Error invoking remote method '[^']+':\s*(Error:\s*)?/g, '')

  if (
    clean.includes('Cannot modify events in read-only calendar') ||
    clean.includes('Move rejected: Cannot modify') ||
    clean.includes('read-only calendar')
  ) {
    toast.error('Lịch chỉ đọc (Read-only)', {
      description: 'Sự kiện này thuộc lịch chỉ đọc (như Lịch ngày lễ hoặc lịch được chia sẻ), không thể di chuyển hoặc chỉnh sửa.'
    })
    return
  }

  if (clean.includes('Cannot delete events in read-only calendar')) {
    toast.error('Lịch chỉ đọc (Read-only)', {
      description: 'Không thể xóa sự kiện thuộc lịch chỉ đọc (như Lịch ngày lễ).'
    })
    return
  }

  if (clean.includes('RRULE') || clean.includes('recurrence')) {
    toast.error('Quy tắc lặp không hợp lệ', {
      description: 'Cú pháp quy tắc lặp lại (RRULE) không đúng định dạng RFC 5545.'
    })
    return
  }

  toast.error(fallbackTitle, {
    description: clean || 'Vui lòng thử lại sau.'
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
