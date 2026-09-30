'use client';

import { useState } from 'react';

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const MONTH_NAMES = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
];

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function toISODate(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

function getMonthCells(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  let startWeekday = firstDay.getDay();
  startWeekday = startWeekday === 0 ? 6 : startWeekday - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: { label: string; dateStr: string; isPad: boolean }[] = [];
  for (let i = 0; i < startWeekday; i++) {
    cells.push({ label: '', dateStr: '', isPad: true });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ label: String(d), dateStr: toISODate(year, month, d), isPad: false });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ label: '', dateStr: '', isPad: true });
  }
  return cells;
}

export default function DatePicker({
  value,
  onChange,
  placeholder = 'Chọn ngày'
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const today = new Date();
  const [viewYear, setViewYear] = useState(value ? Number(value.slice(0, 4)) : today.getFullYear());
  const [viewMonth, setViewMonth] = useState(value ? Number(value.slice(5, 7)) - 1 : today.getMonth());

  const todayStr = toISODate(today.getFullYear(), today.getMonth(), today.getDate());
  const cells = getMonthCells(viewYear, viewMonth);

  function displayLabel() {
    if (!value) return placeholder;
    const [y, m, d] = value.split('-');
    return `${d}/${m}/${y}`;
  }

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  }

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%',
          textAlign: 'left',
          height: 40,
          padding: '0 10px',
          borderRadius: 9,
          border: '1px solid var(--border)',
          fontSize: 13,
          background: 'var(--bg)',
          color: value ? 'var(--text)' : 'var(--muted-2)'
        }}
      >
        {displayLabel()}
      </button>
      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 139 }}
          />
          <div
            style={{
              position: 'absolute',
              top: 44,
              left: 0,
              width: 240,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 14,
              boxShadow: '0 16px 40px rgba(20,20,19,0.2)',
              padding: 12,
              zIndex: 140
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <button
                type="button"
                onClick={prevMonth}
                aria-label="Tháng trước"
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 15, width: 26, height: 26 }}
              >
                ‹
              </button>
              <span style={{ fontSize: 12.5, fontWeight: 700 }}>
                {MONTH_NAMES[viewMonth]}, {viewYear}
              </span>
              <button
                type="button"
                onClick={nextMonth}
                aria-label="Tháng sau"
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 15, width: 26, height: 26 }}
              >
                ›
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0,1fr))', gap: 2, marginBottom: 2 }}>
              {WEEKDAYS.map((wd) => (
                <div key={wd} style={{ textAlign: 'center', fontSize: 10, fontWeight: 600, color: 'var(--muted)', padding: '3px 0' }}>
                  {wd}
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0,1fr))', gap: 2 }}>
              {cells.map((cell, i) => {
                if (cell.isPad) return <div key={i} />;
                const isPast = cell.dateStr < todayStr;
                const isSelected = cell.dateStr === value;
                return (
                  <button
                    type="button"
                    key={i}
                    disabled={isPast}
                    onClick={() => {
                      onChange(cell.dateStr);
                      setOpen(false);
                    }}
                    style={{
                      textAlign: 'center',
                      fontSize: 12,
                      padding: '6px 0',
                      borderRadius: 7,
                      border: 'none',
                      cursor: isPast ? 'default' : 'pointer',
                      color: isPast ? '#D8D8D5' : isSelected ? 'var(--accent-contrast)' : 'var(--text)',
                      background: isSelected ? 'var(--accent)' : 'transparent'
                    }}
                  >
                    {cell.label}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
