'use client';

import { useMemo, useState } from 'react';
import type { Project, Task, Brief, Department, Staff } from '../../lib/types';
import { buildRows, type WorkRow } from '../../lib/workRows';
import WorkItemDetailModal from './WorkItemDetailModal';

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

  return (
    <div>
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
