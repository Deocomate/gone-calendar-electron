import { describe, it, expect } from 'vitest'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { DateTime } from 'luxon'
import EventEditorDialog from '../src/renderer/src/editor/EventEditorDialog'
import DatePicker from '../src/renderer/src/components/ui/DatePicker'
import TimePicker from '../src/renderer/src/components/ui/TimePicker'
import CustomSelect from '../src/renderer/src/components/ui/CustomSelect'
import NumberInput from '../src/renderer/src/components/ui/NumberInput'
import TextInput from '../src/renderer/src/components/ui/TextInput'
import ToggleSwitch from '../src/renderer/src/components/ui/ToggleSwitch'
import Checkbox from '../src/renderer/src/components/ui/Checkbox'

describe('UI Components SSR Render & Lifecycle', () => {
  it('renders DatePicker', () => {
    const html = renderToString(
      React.createElement(DatePicker, {
        value: '2026-08-18',
        onChange: () => {}
      })
    )
    expect(html).toBeTruthy()
  })

  it('renders DatePicker with empty value and minDate', () => {
    const html = renderToString(
      React.createElement(DatePicker, {
        value: '',
        minDate: '2026-08-18',
        onChange: () => {}
      })
    )
    expect(html).toBeTruthy()
  })

  it('renders TimePicker with duration badges', () => {
    const html = renderToString(
      React.createElement(TimePicker, {
        value: '10:00',
        startTime: '09:00',
        showQuickDurations: true,
        onChange: () => {}
      })
    )
    expect(html).toBeTruthy()
  })

  it('renders CustomSelect with empty and valid options', () => {
    const html = renderToString(
      React.createElement(CustomSelect, {
        value: 'cal1',
        onChange: () => {},
        options: [{ value: 'cal1', label: 'My Calendar', color: '#1A73E8' }]
      })
    )
    expect(html).toBeTruthy()
  })

  it('renders NumberInput, TextInput, ToggleSwitch, Checkbox', () => {
    expect(renderToString(React.createElement(NumberInput, { value: 5, onChange: () => {} }))).toBeTruthy()
    expect(renderToString(React.createElement(TextInput, { value: 'Hello', onChange: () => {} }))).toBeTruthy()
    expect(renderToString(React.createElement(ToggleSwitch, { checked: true, onChange: () => {} }))).toBeTruthy()
    expect(renderToString(React.createElement(Checkbox, { checked: true, onChange: () => {} }))).toBeTruthy()
  })

  it('renders EventEditorDialog when closed (isOpen=false)', () => {
    const html = renderToString(
      React.createElement(EventEditorDialog, {
        isOpen: false,
        calendars: [],
        data: null,
        onSave: () => {},
        onDelete: () => {},
        onClose: () => {}
      })
    )
    expect(html).toBe('')
  })

  it('renders EventEditorDialog when open (isOpen=true) on cell click data', () => {
    const html = renderToString(
      React.createElement(EventEditorDialog, {
        isOpen: true,
        calendars: [
          {
            id: 'cal1',
            name: 'Main',
            color: '#4A90E2',
            isVisible: true,
            isReadOnly: false,
            accountId: 'local',
            isDefault: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ],
        data: {
          initialStart: DateTime.local(),
          initialEnd: DateTime.local().plus({ hours: 1 })
        },
        onSave: () => {},
        onDelete: () => {},
        onClose: () => {}
      })
    )
    expect(html).toContain('Tạo sự kiện mới')
    expect(html).toContain('Bắt đầu (Start)')
    expect(html).toContain('Kết thúc (End)')
  })
})
