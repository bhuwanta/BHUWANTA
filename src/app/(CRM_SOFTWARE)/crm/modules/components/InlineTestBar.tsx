'use client'

import React from 'react'
import { Clock, X, ChevronDown, Loader2, Send } from 'lucide-react'

interface InlineTestBarProps {
  type: 'email' | 'wa'
  target: string
  selectedTestHour: string
  onSelectTestHour: (hour: string) => void
  isExecutingTest: boolean
  onExecuteTest: (type: 'email' | 'wa', target: string) => void
  onClose: () => void
}

export default function InlineTestBar({
  type,
  target,
  selectedTestHour,
  onSelectTestHour,
  isExecutingTest,
  onExecuteTest,
  onClose
}: InlineTestBarProps) {
  return (
    <div className="mt-3 pt-3 border-t border-[#e8ecf2] space-y-2.5 bg-[#f8fafc] p-3 rounded-lg">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[#0f1d33] flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-[#1e3a5f]" />
          Select Cron Slot to Simulate
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-gray-400 hover:text-gray-600 p-0.5"
          title="Cancel"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1">
          <select
            value={selectedTestHour}
            onChange={(e) => onSelectTestHour(e.target.value)}
            className="w-full appearance-none rounded-lg border border-[#cbd5e1] bg-white pl-3 pr-8 py-2 text-xs font-medium text-[#0f1d33] outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f] cursor-pointer"
          >
            <option value="current">Current Real-Time (Live leads right now)</option>
            <option value="6">6:00 AM IST (Master Report - All-Time Database Leads)</option>
            <option value="9">9:00 AM IST (Window: 6:00 AM - 9:00 AM)</option>
            <option value="12">12:00 PM IST (Window: 9:00 AM - 12:00 PM)</option>
            <option value="15">3:00 PM IST (Window: 12:00 PM - 3:00 PM)</option>
            <option value="18">6:00 PM IST (Master Report - All-Time Database Leads)</option>
            <option value="21">9:00 PM IST (Window: 6:00 PM - 9:00 PM)</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5">
            <ChevronDown className="w-4 h-4 text-gray-500" />
          </div>
        </div>

        <button
          type="button"
          disabled={isExecutingTest}
          onClick={() => onExecuteTest(type, target)}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#1e3a5f] hover:bg-[#0f1d33] rounded-lg transition-colors disabled:opacity-50 shrink-0"
        >
          {isExecutingTest ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          Send Test
        </button>
      </div>

      <p className="text-[11px] text-[#5a6a82] leading-relaxed">
        {selectedTestHour === '6' || selectedTestHour === '18'
          ? 'Master Slot: Generates the comprehensive Excel report containing all leads in the CRM database.'
          : selectedTestHour === 'current'
          ? 'Current Slot: Evaluates leads based on current live clock time.'
          : '3-Hour Delta Slot: Queries leads captured strictly within this 3-hour window.'}
      </p>
    </div>
  )
}
