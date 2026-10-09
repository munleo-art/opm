'use client';

import { useMemo, useState } from 'react';
import type { Project, Task, Brief, Department, Staff } from '../../lib/types';
import { buildRows, type WorkRow } from '../../lib/workRows';
import WorkItemDetailModal from './WorkItemDetailModal';
import { useIsMobile } from '../../lib/useIsMobile';

type DeptKey = 'st' | 'mkt' | 'ttth' | 'dung';

const DEPT_OPTIONS: { key: DeptKey; label: string; deptName: string }[] = [
  { key: 'st', label: 'Ban Sáng tạo', deptName: 'Ban Sáng tạo' },
  { key: 'mkt', label: 'Ban Marketing', deptName: 'Ban Marketing' },
  { key: 'ttth', label: 'Ban TTTH', deptName: 'Ban TTTH' },
  { key: 'dung', label: 'Team Dựng phim', deptName: 'Team Dựng phim' }
];

const MONTH_NAMES = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
];
const WEEKDAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

// Không giới hạn số thanh/tuần — mọi đầu việc trùng ngày đều phải có 1 dòng riêng,
// xếp trên-dưới rõ ràng, không ẩn/che nhau. Chiều cao hàng tuần tự giãn theo số lượng.
const LANE_HEIGHT = 24;

// Màu pastel nhẹ, không dùng màu rực — mỗi dự án 1 màu cố định (hash theo id dự án) để nhiều
// đầu việc cùng dự án luôn ra cùng màu, dù đang lọc theo team hay theo nhân sự.
const PROJECT_COLOR_PALETTE = [
  '#8AA9D6', '#8FC1A9', '#E0B08C', '#D98C8C', '#B6A0D9',
  '#7FC4C4', '#D9A8C0', '#A8A878', '#9FB8D9', '#C9A88A'
];

function colorForProject(projectId: string): string {
  let hash = 0;
  for (let i = 0; i < projectId.length; i++) {
    hash = (hash * 31 + projectId.charCodeAt(i)) >>> 0;
  }
  return PROJECT_COLOR_PALETTE[hash % PROJECT_COLOR_PALETTE.length];
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function rowBelongsToTeam(r: WorkRow, deptKey: DeptKey): boolean {
  if (deptKey === 'mkt') return !!r.mktStaff;
  if (deptKey === 'ttth') return !!r.ttthStaff;
  if (deptKey === 'st') return r.stTasks.length > 0;
  return r.dungTasks.length > 0;
}

function rowMatchesStaff(r: WorkRow, deptKey: DeptKey, staffId: string): boolean {
  if (deptKey === 'mkt') return r.mktStaff?.id === staffId;
  if (deptKey === 'ttth') return r.ttthStaff?.id === staffId;
  if (deptKey === 'st') return r.stTasks.some((t) => (t.st_assignee ?? t.assignee)?.id === staffId);
  return r.dungTasks.some((t) => (t.dung_assignee ?? t.assignee)?.id === staffId);
}

interface RowRange {
  row: WorkRow;
  start: Date;
  end: Date;
}

// Chưa có mốc "ngày bắt đầu" riêng trong DB, nên lấy ngày tạo sớm nhất trong các task/brief của
// đầu việc làm điểm bắt đầu, và deadline gần nhất làm điểm kết thúc — vẽ thành 1 thanh liên tục
// từ ngày bắt đầu tới deadline. Đầu việc chưa có deadline thì hiện 1 ô đúng ngày bắt đầu.
function getRowRange(r: WorkRow): RowRange | null {
  const createdDates: Date[] = [];
  if (r.brief?.posted_at) createdDates.push(startOfDay(new Date(r.brief.posted_at)));
  if (r.primaryTask?.created_at) createdDates.push(startOfDay(new Date(r.primaryTask.created_at)));
  if (r.backingTask?.created_at) createdDates.push(startOfDay(new Date(r.backingTask.created_at)));
  if (r.ttthTask?.created_at) createdDates.push(startOfDay(new Date(r.ttthTask.created_at)));
  r.stTasks.forEach((t) => t.created_at && createdDates.push(startOfDay(new Date(t.created_at))));
  r.dungTasks.forEach((t) => t.created_at && createdDates.push(startOfDay(new Date(t.created_at))));

  const startFromCreated = createdDates.length
    ? new Date(Math.min(...createdDates.map((d) => d.getTime())))
    : null;

  if (!startFromCreated && !r.nearestDeadline) return null;

  const end = r.nearestDeadline ? startOfDay(new Date(r.nearestDeadline)) : (startFromCreated as Date);
  let start = startFromCreated ?? end;
  if (start.getTime() > end.getTime()) start = end;

  return { row: r, start, end };
}

interface DayCell {
  key: string;
  dayNum: number;
  dim: boolean;
  isToday: boolean;
}

interface Bar {
  key: string;
  row: WorkRow;
  startCol: number;
  endCol: number;
  lane: number;
  roundedLeft: boolean;
  roundedRight: boolean;
  color: string;
  completed: boolean;
}

interface WeekData {
  key: string;
  height: number;
  days: DayCell[];
  bars: Bar[];
  laneCount: number;
  // Tuần đã kết thúc trước hôm nay (CN của tuần < hôm nay) — mặc định ẩn ở tab Lịch.
  isPast: boolean;
}

function buildWeeks(year: number, month: number, ranges: RowRange[], today: Date): WeekData[] {
  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);
  const firstDow = (firstOfMonth.getDay() + 6) % 7;
  const gridStart = addDays(firstOfMonth, -firstDow);
  const lastDow = (lastOfMonth.getDay() + 6) % 7;
  const gridEnd = addDays(lastOfMonth, 6 - lastDow);
  const totalDays = Math.round((gridEnd.getTime() - gridStart.getTime()) / 86400000) + 1;
  const totalWeeks = totalDays / 7;

  const weeks: WeekData[] = [];

  for (let w = 0; w < totalWeeks; w++) {
    const weekStart = addDays(gridStart, w * 7);
    const weekEnd = addDays(weekStart, 6);

    const days: DayCell[] = [];
    for (let d = 0; d < 7; d++) {
      const date = addDays(weekStart, d);
      days.push({
        key: `d${w}-${d}`,
        dayNum: date.getDate(),
        dim: date.getMonth() !== month,
        isToday: isSameDay(date, today)
      });
    }

    const weekItems = ranges
      .filter((r) => r.end.getTime() >= weekStart.getTime() && r.start.getTime() <= weekEnd.getTime())
      .map((r) => {
        const clipStart = r.start.getTime() < weekStart.getTime() ? weekStart : r.start;
        const clipEnd = r.end.getTime() > weekEnd.getTime() ? weekEnd : r.end;
        const startCol = Math.round((clipStart.getTime() - weekStart.getTime()) / 86400000);
        const endCol = Math.round((clipEnd.getTime() - weekStart.getTime()) / 86400000);
        return { r, startCol, endCol, lane: 0 };
      })
      .sort((a, b) => (a.startCol - b.startCol) || ((b.endCol - b.startCol) - (a.endCol - a.startCol)));

    const laneEnds: number[] = [];
    weekItems.forEach((item) => {
      let lane = laneEnds.findIndex((end) => end < item.startCol);
      if (lane === -1) lane = laneEnds.length;
      laneEnds[lane] = item.endCol;
      item.lane = lane;
    });

    // Dùng số cột nguyên (0-6) thay vì % để đặt thanh theo đúng lưới CSS Grid repeat(7,1fr) —
    // cùng 1 lưới với lớp số ngày phía trên, nên ranh giới các thanh luôn khớp chính xác với
    // ranh giới ô ngày, không bị lệch/đè lên nhau ở biên giữa 2 ngày.
    const bars: Bar[] = weekItems.map((item) => {
      const roundedLeft = isSameDay(item.r.start, addDays(weekStart, item.startCol));
      const roundedRight = isSameDay(item.r.end, addDays(weekStart, item.endCol));
      return {
        key: `${item.r.row.key}-${w}`,
        row: item.r.row,
        startCol: item.startCol,
        endCol: item.endCol,
        lane: item.lane,
        roundedLeft,
        roundedRight,
        color: colorForProject(item.r.row.project.id),
        completed: item.r.row.completed
      };
    });

    let usedLanes = 0;
    weekItems.forEach((item) => {
      if (item.lane + 1 > usedLanes) usedLanes = item.lane + 1;
    });
    const laneCount = Math.max(usedLanes, 1);
    const weekHeight = 30 + laneCount * LANE_HEIGHT + 10;

    weeks.push({ key: `w${w}`, height: weekHeight, days, bars, laneCount, isPast: weekEnd.getTime() < today.getTime() });
  }

  return weeks;
}


// ===== Lịch trên điện thoại: danh sách theo tuần, xếp theo HẠN CHÓT (không vẽ lưới 7 cột) =====

interface AgendaWeek {
  key: string;
  start: Date;
  end: Date;
  isPast: boolean;
  isCurrent: boolean;
  items: RowRange[];
}

function buildAgenda(year: number, month: number, ranges: RowRange[], today: Date): AgendaWeek[] {
  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);
  const gridStart = addDays(firstOfMonth, -((firstOfMonth.getDay() + 6) % 7));
  const gridEnd = addDays(lastOfMonth, 6 - ((lastOfMonth.getDay() + 6) % 7));
  const result: AgendaWeek[] = [];
  for (let ws = gridStart; ws.getTime() <= gridEnd.getTime(); ws = addDays(ws, 7)) {
    const we = addDays(ws, 6);
    const items = ranges
      .filter((r) => r.end.getTime() >= ws.getTime() && r.end.getTime() <= we.getTime())
      .sort((a, b) => a.end.getTime() - b.end.getTime() || a.row.project.title.localeCompare(b.row.project.title, 'vi'));
    result.push({
      key: `a${ws.getTime()}`,
      start: ws,
      end: we,
      isPast: we.getTime() < today.getTime(),
      isCurrent: today.getTime() >= ws.getTime() && today.getTime() <= we.getTime(),
      items
    });
  }
  return result;
}

const pad2 = (n: number) => String(n).padStart(2, '0');
const ddmm = (d: Date) => `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`;

function MobileAgenda({
  weeks,
  today,
  onOpen
}: {
  weeks: AgendaWeek[];
  today: Date;
  onOpen: (rowKey: string) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {weeks.map((w) => (
        <div key={w.key}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, margin: '0 2px 8px' }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: w.isCurrent ? 'var(--text)' : 'var(--muted)' }}>
              Tuần {ddmm(w.start)} – {ddmm(w.end)}
              {w.isCurrent && (
                <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: 'var(--accent)', color: 'var(--accent-contrast)' }}>
                  Tuần này
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{w.items.length} việc đến hạn</div>
          </div>

          {w.items.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--muted)', padding: '12px 14px', border: '1px dashed var(--border)', borderRadius: 12 }}>
              Không có việc đến hạn.
            </div>
          ) : (
            <div style={{ border: '1px solid var(--border)', borderRadius: 14, background: 'var(--surface)', overflow: 'hidden' }}>
              {w.items.map((it, i) => {
                const isToday = isSameDay(it.end, today);
                const overdue = !it.row.completed && it.end.getTime() < today.getTime();
                const dow = WEEKDAY_LABELS[(it.end.getDay() + 6) % 7];
                return (
                  <div
                    key={it.row.key}
                    role="button"
                    tabIndex={0}
                    onClick={() => onOpen(it.row.key)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', cursor: 'pointer',
                      borderTop: i === 0 ? 'none' : '1px solid var(--border)', opacity: it.row.completed ? 0.6 : 1
                    }}
                  >
                    <span style={{ width: 10, height: 10, borderRadius: 3, flexShrink: 0, background: colorForProject(it.row.project.id) }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 14, fontWeight: 600, lineHeight: 1.35, wordBreak: 'break-word',
                          textDecoration: it.row.completed ? 'line-through' : 'none'
                        }}
                      >
                        {it.row.completed ? '✓ ' : ''}
                        {it.row.headline || '—'}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2, lineHeight: 1.35 }}>
                        {it.row.project.title}
                        {!isSameDay(it.start, it.end) && ` · từ ${ddmm(it.start)}`}
                      </div>
                    </div>
                    <div
                      style={{
                        flexShrink: 0, textAlign: 'right', fontSize: 12, fontWeight: 700, lineHeight: 1.3,
                        color: isToday || overdue ? '#C63C3C' : 'var(--text)'
                      }}
                    >
                      <div>{isToday ? 'Hôm nay' : dow}</div>
                      <div style={{ fontWeight: 500, color: isToday || overdue ? '#C63C3C' : 'var(--muted)' }}>{ddmm(it.end)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function CalendarTab({
  projects,
  tasks,
  briefs,
  departments,
  allStaff,
  me,
  onRefetch
}: {
  projects: Project[];
  tasks: Task[];
  briefs: Brief[];
  departments: Department[];
  allStaff: Staff[];
  me: Staff | null;
  onRefetch: () => void;
}) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedTeam, setSelectedTeam] = useState<DeptKey>('st');
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [selectedRowKey, setSelectedRowKey] = useState<string | null>(null);
  const [hiddenProjectIds, setHiddenProjectIds] = useState<Set<string>>(new Set());
  // Tuần đã qua mặc định ẩn; bấm nút "Hiện tuần đã qua" để xem lại.
  const [showPastWeeks, setShowPastWeeks] = useState(false);
  const isMobile = useIsMobile();

  const rows = useMemo(() => buildRows(projects, tasks, briefs, departments), [projects, tasks, briefs, departments]);

  const visibleRows = useMemo(() => {
    return rows.filter((r) =>
      selectedStaffId ? rowMatchesStaff(r, selectedTeam, selectedStaffId) : rowBelongsToTeam(r, selectedTeam)
    );
  }, [rows, selectedTeam, selectedStaffId]);

  const ranges = useMemo(() => {
    return visibleRows
      .map((r) => getRowRange(r))
      .filter((r): r is RowRange => r !== null);
  }, [visibleRows]);

  // Danh sách "Màu theo dự án" luôn liệt kê đủ các dự án trong lựa chọn team/nhân sự hiện tại
  // (không bị rút gọn khi đang ẩn bớt), để bấm bật lại được. Chỉ phần render Lịch mới lọc bỏ
  // các dự án đang bị ẩn.
  const legend = useMemo(() => {
    const seen = new Set<string>();
    const result: { id: string; title: string; color: string }[] = [];
    ranges.forEach((r) => {
      const p = r.row.project;
      if (!seen.has(p.id)) {
        seen.add(p.id);
        result.push({ id: p.id, title: p.title, color: colorForProject(p.id) });
      }
    });
    return result;
  }, [ranges]);

  const visibleRanges = useMemo(
    () => ranges.filter((r) => !hiddenProjectIds.has(r.row.project.id)),
    [ranges, hiddenProjectIds]
  );

  const weeks = useMemo(() => buildWeeks(year, month, visibleRanges, today), [year, month, visibleRanges, today]);
  const pastWeekCount = weeks.filter((w) => w.isPast).length;
  const shownWeeks = showPastWeeks ? weeks : weeks.filter((w) => !w.isPast);
  const agendaWeeks = useMemo(() => buildAgenda(year, month, visibleRanges, today), [year, month, visibleRanges, today]);
  const shownAgendaWeeks = showPastWeeks ? agendaWeeks : agendaWeeks.filter((w) => !w.isPast);

  function toggleProject(id: string) {
    setHiddenProjectIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const selectedRow = rows.find((r) => r.key === selectedRowKey) ?? null;
  const monthLabel = `${MONTH_NAMES[month]} ${year}`;
  const filterModeLabel = selectedStaffId
    ? allStaff.find((s) => s.id === selectedStaffId)?.name ?? ''
    : DEPT_OPTIONS.find((d) => d.key === selectedTeam)?.label ?? '';

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(year - 1); } else { setMonth(month - 1); }
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(year + 1); } else { setMonth(month + 1); }
  }
  function goToday() {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
  }
  function selectTeam(key: DeptKey) {
    setSelectedTeam(key);
    setSelectedStaffId('');
  }

  const mBtn: React.CSSProperties = {
    height: 40, minWidth: 40, padding: '0 12px', border: '1px solid var(--border)', borderRadius: 11,
    background: 'var(--surface)', color: 'var(--text)', fontSize: 14, fontWeight: 600, cursor: 'pointer'
  };
  const mSelect: React.CSSProperties = {
    flex: 1, minWidth: 0, height: 44, padding: '0 10px', borderRadius: 11, border: '1px solid var(--border)',
    background: 'var(--surface)', color: 'var(--text)'
  };
  const teamStaff = allStaff.filter((st) => st.department?.name === DEPT_OPTIONS.find((d) => d.key === selectedTeam)?.deptName);

  return (
    <div>
      {isMobile && (
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Lịch</h1>
            <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>Xếp theo hạn chót</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <button onClick={prevMonth} aria-label="Tháng trước" style={mBtn}>‹</button>
            <div style={{ flex: 1, textAlign: 'center', fontSize: 15, fontWeight: 700 }}>{monthLabel}</div>
            <button onClick={nextMonth} aria-label="Tháng sau" style={mBtn}>›</button>
            <button onClick={goToday} style={mBtn}>Hôm nay</button>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <select value={selectedTeam} onChange={(e) => selectTeam(e.target.value as DeptKey)} style={mSelect}>
              {DEPT_OPTIONS.map((d) => (
                <option key={d.key} value={d.key}>{d.label}</option>
              ))}
            </select>
            <select value={selectedStaffId} onChange={(e) => setSelectedStaffId(e.target.value)} style={mSelect}>
              <option value="">Cả team</option>
              {teamStaff.map((st) => (
                <option key={st.id} value={st.id}>{st.name}</option>
              ))}
            </select>
          </div>

          {agendaWeeks.some((w) => w.isPast) && (
            <button
              onClick={() => setShowPastWeeks((v) => !v)}
              style={{ ...mBtn, width: '100%', marginBottom: 14, fontSize: 13.5, background: showPastWeeks ? 'var(--chip)' : 'var(--surface)' }}
            >
              {showPastWeeks ? 'Ẩn tuần đã qua' : `Hiện tuần đã qua (${agendaWeeks.filter((w) => w.isPast).length})`}
            </button>
          )}

          {shownAgendaWeeks.length === 0 ? (
            <div style={{ padding: '28px 8px', textAlign: 'center', fontSize: 14, color: 'var(--muted)' }}>
              Tất cả các tuần của tháng này đã qua.
            </div>
          ) : (
            <MobileAgenda weeks={shownAgendaWeeks} today={today} onOpen={setSelectedRowKey} />
          )}
        </div>
      )}

      {!isMobile && (
      <>
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, gap: 12, flexWrap: 'wrap'
        }}
      >
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 600, margin: '0 0 4px' }}>Lịch</h1>
          <p style={{ fontSize: 13.5, color: 'var(--muted)', margin: 0 }}>
            Đang xem theo: <strong style={{ color: 'var(--text)' }}>{filterModeLabel}</strong>
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={prevMonth}
            aria-label="Tháng trước"
            style={{ height: 36, width: 36, border: '1px solid var(--border)', borderRadius: 9, background: 'var(--surface)', cursor: 'pointer', fontSize: 15, color: 'var(--text)' }}
          >
            ‹
          </button>
          <div style={{ minWidth: 140, textAlign: 'center', fontSize: 14, fontWeight: 700 }}>{monthLabel}</div>
          <button
            onClick={nextMonth}
            aria-label="Tháng sau"
            style={{ height: 36, width: 36, border: '1px solid var(--border)', borderRadius: 9, background: 'var(--surface)', cursor: 'pointer', fontSize: 15, color: 'var(--text)' }}
          >
            ›
          </button>
          <button
            onClick={goToday}
            style={{ height: 36, padding: '0 14px', border: '1px solid var(--border)', borderRadius: 9, background: 'var(--surface)', cursor: 'pointer', fontSize: 12.5, fontWeight: 600, color: 'var(--text)', marginLeft: 6 }}
          >
            Hôm nay
          </button>
          <button
            onClick={() => setShowPastWeeks((v) => !v)}
            disabled={pastWeekCount === 0}
            title={pastWeekCount === 0 ? 'Tháng này chưa có tuần nào đã qua' : undefined}
            style={{
              height: 36, padding: '0 14px', border: '1px solid var(--border)', borderRadius: 9,
              background: showPastWeeks ? 'var(--chip)' : 'var(--surface)',
              cursor: pastWeekCount === 0 ? 'default' : 'pointer', opacity: pastWeekCount === 0 ? 0.5 : 1,
              fontSize: 12.5, fontWeight: 600, color: 'var(--text)'
            }}
          >
            {showPastWeeks ? 'Ẩn tuần đã qua' : `Hiện tuần đã qua${pastWeekCount > 0 ? ` (${pastWeekCount})` : ''}`}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 230px', maxWidth: 260, minWidth: 220 }}>
          <div style={{ border: '1px solid var(--border)', borderRadius: 16, background: 'var(--surface)', padding: 14, marginBottom: 16 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.3, color: 'var(--muted)', padding: '0 10px 10px' }}>
              LỌC THEO TEAM / NHÂN SỰ
            </div>

            {DEPT_OPTIONS.map((team) => {
              const isActiveTeam = selectedTeam === team.key;
              const staffList = allStaff.filter((s) => s.department?.name === team.deptName);
              return (
                <div key={team.key}>
                  <div
                    onClick={() => selectTeam(team.key)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '9px 12px', borderRadius: 9, cursor: 'pointer', fontSize: 13, fontWeight: 700,
                      background: isActiveTeam && !selectedStaffId ? 'var(--chip)' : 'transparent'
                    }}
                  >
                    {team.label}
                  </div>
                  {isActiveTeam && (
                    <div>
                      {staffList.map((s) => (
                        <div
                          key={s.id}
                          onClick={() => setSelectedStaffId(s.id)}
                          style={{
                            display: 'block', padding: '7px 12px 7px 30px', borderRadius: 9, cursor: 'pointer', fontSize: 12.5,
                            color: selectedStaffId === s.id ? 'var(--text)' : 'var(--muted)',
                            fontWeight: selectedStaffId === s.id ? 700 : 500,
                            background: selectedStaffId === s.id ? 'var(--chip)' : 'transparent'
                          }}
                        >
                          {s.name}
                        </div>
                      ))}
                      {staffList.length === 0 && (
                        <div style={{ padding: '6px 12px 6px 30px', fontSize: 11.5, color: 'var(--muted-2)' }}>Chưa có nhân sự.</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ border: '1px solid var(--border)', borderRadius: 16, background: 'var(--surface)', padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 10px 10px' }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.3, color: 'var(--muted)' }}>
                MÀU THEO DỰ ÁN
              </div>
              {legend.length > 0 && hiddenProjectIds.size > 0 && (
                <button
                  onClick={() => setHiddenProjectIds(new Set())}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 10.5, fontWeight: 700, color: 'var(--text)', textDecoration: 'underline' }}
                >
                  Hiện tất cả
                </button>
              )}
            </div>
            {legend.length === 0 ? (
              <div style={{ padding: '5px 10px', fontSize: 12, color: 'var(--muted)' }}>Chưa có công việc nào trong lựa chọn này.</div>
            ) : (
              legend.map((lg) => {
                const isHidden = hiddenProjectIds.has(lg.id);
                return (
                  <div
                    key={lg.id}
                    onClick={() => toggleProject(lg.id)}
                    title={isHidden ? 'Bấm để hiện lại trên Lịch' : 'Bấm để ẩn khỏi Lịch'}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px', fontSize: 12,
                      borderRadius: 7, cursor: 'pointer', opacity: isHidden ? 0.45 : 1
                    }}
                  >
                    <span style={{ width: 10, height: 10, borderRadius: 3, flexShrink: 0, background: lg.color }} />
                    <span style={{ textDecoration: isHidden ? 'line-through' : 'none' }}>{lg.title}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div style={{ flex: '999 1 560px', minWidth: 0 }}>
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: 700, border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', background: 'var(--surface)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', fontSize: 10.5, fontWeight: 700, color: 'var(--muted)', letterSpacing: 0.3, borderBottom: '1px solid var(--border)' }}>
                {WEEKDAY_LABELS.map((lbl) => (
                  <div key={lbl} style={{ padding: '9px 10px' }}>{lbl}</div>
                ))}
              </div>

              {shownWeeks.length === 0 && (
                <div style={{ padding: '28px 16px', textAlign: 'center', fontSize: 13, color: 'var(--muted)', borderTop: '1px solid var(--border)' }}>
                  Tất cả các tuần của tháng này đã qua.{' '}
                  <button
                    onClick={() => setShowPastWeeks(true)}
                    style={{ border: 'none', background: 'transparent', color: 'var(--text)', textDecoration: 'underline', cursor: 'pointer', fontSize: 13, padding: 0 }}
                  >
                    Hiện tuần đã qua
                  </button>
                </div>
              )}
              {shownWeeks.map((week) => (
                <div key={week.key} style={{ position: 'relative', minHeight: week.height, borderTop: '1px solid var(--border)' }}>
                  <div style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
                    {week.days.map((day) => (
                      <div
                        key={day.key}
                        style={{ borderRight: '1px solid var(--border)', padding: '6px 6px 0', boxSizing: 'border-box', background: day.dim ? 'rgba(0,0,0,0.015)' : undefined }}
                      >
                        <span
                          style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            minWidth: 20, height: 20, padding: '0 4px', borderRadius: 999,
                            fontSize: 11.5, fontWeight: day.isToday ? 700 : 500,
                            color: day.dim ? 'var(--muted-2)' : (day.isToday ? 'var(--accent-contrast)' : 'var(--text)'),
                            background: day.isToday ? 'var(--accent)' : 'transparent'
                          }}
                        >
                          {day.dayNum}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      top: 30,
                      bottom: 0,
                      display: 'grid',
                      gridTemplateColumns: 'repeat(7,1fr)',
                      gridTemplateRows: `repeat(${week.laneCount}, ${LANE_HEIGHT}px)`
                    }}
                  >
                    {week.bars.map((bar) => (
                      <div
                        key={bar.key}
                        onClick={() => setSelectedRowKey(bar.row.key)}
                        title={`${bar.row.project.title} — ${bar.row.headline}`}
                        style={{
                          gridColumn: `${bar.startCol + 1} / ${bar.endCol + 2}`,
                          gridRow: bar.lane + 1,
                          alignSelf: 'start',
                          margin: '0 3px',
                          height: 20,
                          borderRadius: `${bar.roundedLeft ? 7 : 2}px ${bar.roundedRight ? 7 : 2}px ${bar.roundedRight ? 7 : 2}px ${bar.roundedLeft ? 7 : 2}px`,
                          background: bar.color,
                          opacity: bar.completed ? 0.55 : 1,
                          display: 'flex',
                          alignItems: 'center',
                          padding: '0 8px',
                          fontSize: 11,
                          fontWeight: 600,
                          color: '#2B2B28',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis',
                          cursor: 'pointer',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                          boxSizing: 'border-box'
                        }}
                      >
                        {bar.completed ? '✅ ' : ''}{bar.row.project.title} · {bar.row.headline}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      </>
      )}

      {selectedRow && (
        <WorkItemDetailModal
          headline={selectedRow.headline}
          brief={selectedRow.brief}
          primaryTask={selectedRow.primaryTask}
          backingTask={selectedRow.backingTask}
          ttthTask={selectedRow.ttthTask}
          stTasks={selectedRow.stTasks}
          dungTasks={selectedRow.dungTasks}
          me={me}
          onClose={() => setSelectedRowKey(null)}
          onRefetch={onRefetch}
        />
      )}
    </div>
  );
}
