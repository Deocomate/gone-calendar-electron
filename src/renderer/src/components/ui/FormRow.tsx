import React from 'react'

export interface FormRowProps {
  /** Muted label shown in the left column (~115 px). */
  label: string
  /** Whether to show a 1 px hairline at the bottom of the row. */
  divider?: boolean
  /** Whether to align label to top for multiline content (notes, attendees). */
  alignTop?: boolean
  /** Additional className for the row wrapper. */
  className?: string
  children: React.ReactNode
}

/**
 * Notion-style property row with generous, uniform spacing.
 *
 * Layout:
 *   [label ~115px muted 12px/400]  [children grow]
 */
export const FormRow: React.FC<FormRowProps> = ({
  label,
  divider = false,
  alignTop = false,
  className = '',
  children
}) => {
  return (
    <div
      className={`group flex ${
        alignTop ? 'items-start py-1.5' : 'items-center min-h-[38px] py-0.5'
      } px-1 transition-colors duration-100 ${
        divider ? 'border-b border-hairline' : ''
      } ${className}`}
    >
      {/* Label column */}
      <span
        className={`w-[115px] shrink-0 pr-3 text-[12px] font-normal text-muted select-none ${
          alignTop ? 'pt-1 leading-normal' : 'leading-none'
        }`}
      >
        {label}
      </span>

      {/* Value column */}
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}

export default FormRow
