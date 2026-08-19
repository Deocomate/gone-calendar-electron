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

import FormRow from '../src/renderer/src/components/ui/FormRow'
import TextArea from '../src/renderer/src/components/ui/TextArea'
import WeekView from '../src/renderer/src/views/WeekView'

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

  it('renders NumberInput, TextInput, TextArea, FormRow, ToggleSwitch, Checkbox', () => {
    expect(renderToString(React.createElement(NumberInput, { value: 5, onChange: () => {} }))).toBeTruthy()
    expect(renderToString(React.createElement(TextInput, { value: 'Hello', onChange: () => {} }))).toBeTruthy()
    expect(renderToString(React.createElement(TextArea, { value: 'Note content', onChange: () => {} }))).toBeTruthy()
    expect(
      renderToString(
        React.createElement(
          FormRow,
          { label: 'Test Label', divider: true },
          React.createElement('div', null, 'Child')
        )
      )
    ).toContain('Test Label')
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
    expect(html).toContain('Bắt đầu')
    expect(html).toContain('Kết thúc')
  })

  it('week view fits available width and stacks lunar under the solar day', () => {
    const html = renderToString(
      React.createElement(WeekView, {
        anchorDate: DateTime.fromISO('2026-08-19'),
        occurrences: [],
        showLunar: true,
        showWeekNumbers: false
      })
    )
    expect(html).not.toContain('min-w-[1180px]')
    expect(html).not.toContain('overflow-x-auto')
    expect(html).toContain('minmax(0,1fr)')
    expect(html).toContain('gc-week-header')
    expect(html).toContain('flex-col items-center')
  })
})
