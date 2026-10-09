'use client';

import { useMemo, useState } from 'react';
import type { Project, Task, Brief, Department, Staff } from '../../lib/types';
import { buildRows, type WorkRow } from '../../lib/workRows';
import WorkItemDetailModal from './WorkItemDetailModal';
import StaffInfoModal from './StaffInfoModal';
import ProjectPipelineModal from './ProjectPipelineModal';
import { canAddProject } from '../../lib/permissions';
import { useIsMobile } from '../../lib/useIsMobile';

type SortKey = 'deadline' | 'name-asc' | 'name-desc';
type ViewMode = 'list' | 'grid';
type TeamFilterKey = 'mkt' | 'ttth' | 'st' | 'dung';

const TEAM_FILTER_OPTIONS: { value: TeamFilterKey; label: string; deptName: string }[] = [
  { value: 'mkt', label: 'Ban MKT', deptName: 'Ban Marketing' },
  { value: 'ttth', label: 'Ban TTTH', deptName: 'Ban TTTH' },
  { value: 'st', label: 'Ban Sáng tạo', deptName: 'Ban Sáng tạo' },
  { value: 'dung', label: 'Team Dựng', deptName: 'Team Dựng phim' }
];

function daysUntil(dateStr: string) {
  const d = new Date(dateStr);
  const today = new Date();
  const dOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const tOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((dOnly.getTime() - tOnly.getTime()) / 86400000);
}

// Sát deadline 2 ngày (tính cả ngày deadline) => đỏ đậm.
// Gần deadline 4 ngày (tính cả ngày deadline) => cam đậm.
// Đã đánh dấu "Hoàn thành công việc" => xanh lá, bỏ qua trạng thái deadline.
// Chưa tới hạn (hoặc chưa đặt deadline) và chưa hoàn thành => xanh blue, thay cho màu đen mặc định.
function rowStyle(diffDays: number | null, completed: boolean) {
  if (completed) return { color: '#2E7D32', fontWeight: 400 };
  if (diffDays === null) return { color: '#7B9ACC', fontWeight: 400 };
  if (diffDays <= 1) return { color: '#C63C3C', fontWeight: 700 };
  if (diffDays <= 3) return { color: '#C2760B', fontWeight: 700 };
  return { color: '#7B9ACC', fontWeight: 400 };
}

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--chip)', overflow: 'hidden' }}>
        <div
          style={{
            width: `${percent}%`,
            height: '100%',
            background: percent >= 100 ? '#2E7D32' : 'currentColor',
            borderRadius: 3
          }}
        />
      </div>
      <span style={{ fontSize: 10.5, minWidth: 28, textAlign: 'right' }}>{percent}%</span>
    </div>
  );
}

function NameButtons({ names, onPick }: { names: { staff: Staff }[]; onPick: (s: Staff) => void }) {
  if (names.length === 0) return <span>—</span>;
  return (
    <span>
      {names.map((n, i) => (
        <span key={n.staff.id + i}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPick(n.staff);
            }}
            style={{
              color: 'inherit', fontWeight: 'inherit', background: 'none', border: 'none',
              padding: 0, font: 'inherit', textDecoration: 'underline', cursor: 'pointer'
            }}
          >
            {n.staff.name}
          </button>
          {i < names.length - 1 && ', '}
        </span>
      ))}
    </span>
  );
}

function compareWithinGroup(a: WorkRow, b: WorkRow, sortKey: SortKey): number {
  if (sortKey === 'name-asc') return a.project.title.localeCompare(b.project.title, 'vi');
  if (sortKey === 'name-desc') return b.project.title.localeCompare(a.project.title, 'vi');
  if (!a.nearestDeadline && !b.nearestDeadline) return 0;
  if (!a.nearestDeadline) return 1;
  if (!b.nearestDeadline) return -1;
  return new Date(a.nearestDeadline).getTime() - new Date(b.nearestDeadline).getTime();
}

// Dòng đã "HOÀN THÀNH CÔNG VIỆC" luôn bị đẩy xuống dưới cùng danh sách, bất kể đang chọn
// kiểu sắp xếp nào — trong từng nhóm (đã xong / chưa xong) vẫn áp dụng đúng thứ tự sortKey.
function sortRows(rows: WorkRow[], sortKey: SortKey): WorkRow[] {
  const sorted = [...rows];
  sorted.sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return compareWithinGroup(a, b, sortKey);
  });
  return sorted;
}

// Lọc dòng theo 1 nhân sự cụ thể trong đúng vai trò (team) đã chọn — chỉ có tác dụng khi cả
// 2 ô "Lọc theo team" và "Lọc theo nhân sự" đều đã chọn.
function rowMatchesStaffFilter(row: WorkRow, team: TeamFilterKey | '', staffId: string): boolean {
  if (!team || !staffId) return true;
  if (team === 'mkt') return row.mktStaff?.id === staffId;
  if (team === 'ttth') return row.ttthStaff?.id === staffId;
  if (team === 'st') return row.stTasks.some((t) => (t.st_assignee ?? t.assignee)?.id === staffId);
  if (team === 'dung') return row.dungTasks.some((t) => (t.dung_assignee ?? t.assignee)?.id === staffId);
  return true;
}

const COLS = '1.3fr 1.4fr 1fr 1fr 1fr 1fr 1.1fr 1fr';

// ===== Giao diện điện thoại: mỗi đầu việc = 1 thẻ =====

function deadlineBadge(row: WorkRow, diffDays: number | null): { text: string; fg: string; bg: string } {
  if (row.completed) return { text: '✓ Đã xong', fg: '#2E7D32', bg: 'rgba(46,125,50,0.12)' };
  if (diffDays === null || !row.nearestDeadline) return { text: 'Chưa có hạn', fg: 'var(--muted)', bg: 'var(--chip)' };
  if (diffDays < 0) return { text: `Quá hạn ${-diffDays} ngày`, fg: '#C63C3C', bg: 'rgba(198,60,60,0.12)' };
  if (diffDays === 0) return { text: 'Hạn hôm nay', fg: '#C63C3C', bg: 'rgba(198,60,60,0.12)' };
  if (diffDays === 1) return { text: 'Hạn ngày mai', fg: '#C63C3C', bg: 'rgba(198,60,60,0.12)' };
  if (diffDays <= 3) return { text: `Còn ${diffDays} ngày`, fg: '#C2760B', bg: 'rgba(194,118,11,0.12)' };
  const d = new Date(row.nearestDeadline);
  return {
    text: `Hạn ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
    fg: 'var(--muted)',
    bg: 'var(--chip)'
  };
}

function MobileWorkCard({
  row,
  onOpen,
  onOpenProject,
  onPickStaff
}: {
  row: WorkRow;
  onOpen: () => void;
  onOpenProject: () => void;
  onPickStaff: (s: Staff) => void;
}) {
  const diffDays = row.nearestDeadline ? daysUntil(row.nearestDeadline) : null;
  const accent = rowStyle(diffDays, row.completed).color;
  const badge = deadlineBadge(row, diffDays);

  const stNames = row.stTasks.map((t) => t.st_assignee ?? t.assignee).filter((x): x is Staff => !!x);
  const dungNames = row.dungTasks.map((t) => t.dung_assignee ?? t.assignee).filter((x): x is Staff => !!x);
  const roles: { label: string; people: Staff[] }[] = [
    { label: 'MKT', people: row.mktStaff ? [row.mktStaff] : [] },
    { label: 'TTTH', people: row.ttthStaff ? [row.ttthStaff] : [] },
    { label: 'ST', people: stNames },
    { label: 'Dựng', people: dungNames }
  ].filter((r) => r.people.length > 0);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      style={{
        position: 'relative',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        padding: '12px 14px 12px 16px',
        overflow: 'hidden',
        cursor: 'pointer',
        opacity: row.completed ? 0.72 : 1
      }}
    >
      <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: accent }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenProject();
          }}
          style={{
            border: 'none', background: 'none', padding: 0, textAlign: 'left', cursor: 'pointer',
            fontSize: 11.5, fontWeight: 600, color: 'var(--muted)', letterSpacing: 0.2, lineHeight: 1.35, minWidth: 0
          }}
        >
          {row.project.title}
        </button>
        <span
          style={{
            flexShrink: 0, fontSize: 11.5, fontWeight: 700, color: badge.fg, background: badge.bg,
            padding: '3px 8px', borderRadius: 999, whiteSpace: 'nowrap'
          }}
        >
          {badge.text}
        </span>
      </div>

      <div
        style={{
          fontSize: 15, fontWeight: 650, lineHeight: 1.35, marginTop: 4, color: 'var(--text)',
          textDecoration: row.completed ? 'line-through' : 'none', wordBreak: 'break-word'
        }}
      >
        {row.headline || '—'}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
        <div style={{ flex: 1, height: 5, borderRadius: 3, background: 'var(--chip)', overflow: 'hidden' }}>
          <div style={{ width: `${row.progress}%`, height: '100%', background: row.progress >= 100 ? '#2E7D32' : accent, borderRadius: 3 }} />
        </div>
        <span style={{ fontSize: 11.5, color: 'var(--muted)', minWidth: 32, textAlign: 'right' }}>{row.progress}%</span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px', marginTop: 10, fontSize: 12.5, lineHeight: 1.4 }}>
        {roles.length === 0 ? (
          <span style={{ color: 'var(--muted)' }}>Chưa giao nhân sự</span>
        ) : (
          roles.map((r) => (
            <span key={r.label} style={{ color: 'var(--text)' }}>
              <span style={{ color: 'var(--muted)', fontSize: 11, fontWeight: 700, marginRight: 4 }}>{r.label}</span>
              {r.people.map((p, i) => (
                <span key={p.id + i}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPickStaff(p);
                    }}
                    style={{ border: 'none', background: 'none', padding: 0, font: 'inherit', color: 'inherit', cursor: 'pointer' }}
                  >
                    {p.name}
                  </button>
                  {i < r.people.length - 1 && ', '}
                </span>
              ))}
            </span>
          ))
        )}
      </div>
    </div>
  );
}


export default function DashboardTab({
  projects, tasks, briefs, departments, allStaff, me, onSelectProject, onRefetch
}: {
  projects: Project[];
  tasks: Task[];
  briefs: Brief[];
  departments: Department[];
  allStaff: Staff[];
  me: Staff | null;
  onSelectProject: (id: string) => void;
  onRefetch: () => void;
}) {
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('deadline');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedRowKey, setSelectedRowKey] = useState<string | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [pipelineOpen, setPipelineOpen] = useState(false);
  const [teamFilter, setTeamFilter] = useState<TeamFilterKey | ''>('');
  const [staffFilter, setStaffFilter] = useState('');
  const isMobile = useIsMobile();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const rows = useMemo(() => buildRows(projects, tasks, briefs, departments), [projects, tasks, briefs, departments]);

  const teamFilterDeptName = TEAM_FILTER_OPTIONS.find((t) => t.value === teamFilter)?.deptName ?? '';
  const staffFilterOptions = teamFilterDeptName
    ? allStaff.filter((s) => s.department?.name === teamFilterDeptName)
    : [];

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    let base = q ? rows.filter((r) => r.project.title.toLowerCase().includes(q)) : rows;
    if (teamFilter && staffFilter) {
      base = base.filter((r) => rowMatchesStaffFilter(r, teamFilter, staffFilter));
    }
    return sortRows(base, sortKey);
  }, [rows, query, sortKey, teamFilter, staffFilter]);

  const selectedRow = rows.find((r) => r.key === selectedRowKey) ?? null;

  const activeFilterCount = (teamFilter ? 1 : 0) + (staffFilter ? 1 : 0) + (sortKey !== 'deadline' ? 1 : 0);
  const mSelect: React.CSSProperties = {
    width: '100%', height: 44, padding: '0 12px', borderRadius: 11, border: '1px solid var(--border)',
    background: 'var(--surface)', color: 'var(--text)'
  };

  return (
    <div>
      {isMobile && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Dashboard</h1>
              <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{filteredRows.length} việc</span>
            </div>
            {canAddProject(me) && (
              <button
                onClick={() => setPipelineOpen(true)}
                aria-label="Thêm công việc mới"
                style={{
                  height: 40, padding: '0 14px', border: 'none', borderRadius: 11, background: 'var(--accent)',
                  color: 'var(--accent-contrast)', fontSize: 14, fontWeight: 700, cursor: 'pointer'
                }}
              >
                + Giao việc
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm tên dự án..."
              style={{ flex: 1, minWidth: 0, height: 44, padding: '0 12px', borderRadius: 11, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
            />
            <button
              onClick={() => setMobileFiltersOpen((v) => !v)}
              style={{
                height: 44, padding: '0 14px', borderRadius: 11, border: '1px solid var(--border)', flexShrink: 0,
                background: mobileFiltersOpen || activeFilterCount > 0 ? 'var(--chip)' : 'var(--surface)',
                color: 'var(--text)', fontSize: 14, fontWeight: 600, cursor: 'pointer'
              }}
            >
              Lọc{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''} {mobileFiltersOpen ? '▴' : '▾'}
            </button>
          </div>

          {mobileFiltersOpen && (
            <div
              style={{
                marginTop: 10, padding: 12, border: '1px solid var(--border)', borderRadius: 14,
                background: 'var(--surface)', display: 'flex', flexDirection: 'column', gap: 10
              }}
            >
              <select
                value={teamFilter}
                onChange={(e) => {
                  setTeamFilter(e.target.value as TeamFilterKey | '');
                  setStaffFilter('');
                }}
                style={mSelect}
              >
                <option value="">Tất cả team</option>
                {TEAM_FILTER_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <select
                value={staffFilter}
                onChange={(e) => setStaffFilter(e.target.value)}
                disabled={!teamFilter}
                style={{ ...mSelect, background: teamFilter ? 'var(--surface)' : 'var(--chip)' }}
              >
                <option value="">{teamFilter ? 'Tất cả nhân sự trong team' : 'Chọn team trước để lọc nhân sự'}</option>
                {staffFilterOptions.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name}
                  </option>
                ))}
              </select>
              <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} style={mSelect}>
                <option value="deadline">Sắp xếp: Deadline gần nhất</option>
                <option value="name-asc">Sắp xếp: Tên A → Z</option>
                <option value="name-desc">Sắp xếp: Tên Z → A</option>
              </select>
              {activeFilterCount > 0 && (
                <button
                  onClick={() => {
                    setTeamFilter('');
                    setStaffFilter('');
                    setSortKey('deadline');
                  }}
                  style={{ alignSelf: 'flex-start', border: 'none', background: 'none', padding: '2px 0', fontSize: 13.5, textDecoration: 'underline', color: 'var(--muted)', cursor: 'pointer' }}
                >
                  Xoá bộ lọc
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {!isMobile && (
      <div
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, gap: 12, flexWrap: 'wrap'
        }}
      >
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 600, margin: '0 0 4px' }}>Dashboard</h1>
          <p style={{ fontSize: 13.5, color: 'var(--muted)', margin: 0 }}>
            Mỗi đầu việc 1 dòng — nhân sự cả 3 ban trên cùng 1 đầu việc.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <select
            value={teamFilter}
            onChange={(e) => {
              setTeamFilter(e.target.value as TeamFilterKey | '');
              setStaffFilter('');
            }}
            style={{
              height: 36,
              padding: '0 10px',
              borderRadius: 9,
              border: '1px solid var(--border)',
              fontSize: 12.5,
              background: 'var(--surface)'
            }}
          >
            <option value="">Lọc theo team</option>
            {TEAM_FILTER_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>

          <select
            value={staffFilter}
            onChange={(e) => setStaffFilter(e.target.value)}
            disabled={!teamFilter}
            style={{
              height: 36,
              padding: '0 10px',
              borderRadius: 9,
              border: '1px solid var(--border)',
              fontSize: 12.5,
              background: teamFilter ? 'var(--surface)' : 'var(--chip)',
              minWidth: 150
            }}
          >
            <option value="">Lọc theo nhân sự</option>
            {staffFilterOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm tên dự án..."
            style={{
              height: 36,
              padding: '0 12px',
              borderRadius: 9,
              border: '1px solid var(--border)',
              fontSize: 13,
              width: 200
            }}
          />

          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            style={{
              height: 36,
              padding: '0 10px',
              borderRadius: 9,
              border: '1px solid var(--border)',
              fontSize: 12.5,
              background: 'var(--surface)'
            }}
          >
            <option value="deadline">Deadline gần nhất</option>
            <option value="name-asc">Tên A → Z</option>
            <option value="name-desc">Tên Z → A</option>
          </select>

          <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 9, overflow: 'hidden' }}>
            <button
              onClick={() => setViewMode('list')}
              aria-label="Xem dạng danh sách"
              style={{
                height: 36, width: 36, border: 'none',
                background: viewMode === 'list' ? 'var(--accent)' : 'transparent',
                color: viewMode === 'list' ? 'var(--accent-contrast)' : 'var(--text)',
                cursor: 'pointer', fontSize: 14
              }}
            >
              ≡
            </button>
            <button
              onClick={() => setViewMode('grid')}
              aria-label="Xem dạng lưới"
              style={{
                height: 36,
                width: 36,
                border: 'none',
                background: viewMode === 'grid' ? 'var(--accent)' : 'transparent',
                color: viewMode === 'grid' ? 'var(--accent-contrast)' : 'var(--text)',
                cursor: 'pointer',
                fontSize: 14
              }}
            >
              ▦
            </button>
          </div>

          {canAddProject(me) && (
            <button
              onClick={() => setPipelineOpen(true)}
              aria-label="Thêm công việc mới"
              title="Thêm công việc mới"
              style={{
                height: 36,
                width: 36,
                border: 'none',
                borderRadius: 9,
                background: 'var(--accent)',
                color: 'var(--accent-contrast)',
                cursor: 'pointer',
                fontSize: 18,
                fontWeight: 700,
                lineHeight: 1
              }}
            >
              +
            </button>
          )}
        </div>
      </div>

      )}

      {isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredRows.map((row) => (
            <MobileWorkCard
              key={row.key}
              row={row}
              onOpen={() => setSelectedRowKey(row.key)}
              onOpenProject={() => onSelectProject(row.project.id)}
              onPickStaff={setSelectedStaff}
            />
          ))}
          {filteredRows.length === 0 && (
            <div style={{ padding: '28px 8px', textAlign: 'center', fontSize: 14, color: 'var(--muted)' }}>Không có đầu việc nào.</div>
          )}
        </div>
      ) : viewMode === 'list' ? (
        <div style={{ border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', background: 'var(--surface)' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: COLS,
              gap: 10,
              padding: '9px 16px',
              borderBottom: '1px solid var(--border)',
              fontSize: 10.5,
              fontWeight: 700,
              color: 'var(--muted)'
            }}
          >
            <div>TÊN DỰ ÁN</div>
            <div>ĐẦU VIỆC</div>
            <div>NHÂN SỰ MKT</div>
            <div>NHÂN SỰ BAN TTTH</div>
            <div>NHÂN SỰ BAN ST</div>
            <div>NHÂN SỰ DỰNG</div>
            <div>TÌNH TRẠNG</div>
            <div>DEADLINE</div>
          </div>

          {filteredRows.map((row) => {
            const diffDays = row.nearestDeadline ? daysUntil(row.nearestDeadline) : null;
            const style = rowStyle(diffDays, row.completed);
            const mktNames = row.mktStaff ? [{ staff: row.mktStaff }] : [];
            const ttthNames = row.ttthStaff ? [{ staff: row.ttthStaff }] : [];
            const stNames = row.stTasks
              .map((t) => t.st_assignee ?? t.assignee)
              .filter((s): s is Staff => !!s)
              .map((s) => ({ staff: s }));
            const dungNames = row.dungTasks
              .map((t) => t.dung_assignee ?? t.assignee)
              .filter((s): s is Staff => !!s)
              .map((s) => ({ staff: s }));
            return (
              <div
                key={row.key}
                style={{
                  display: 'grid',
                  gridTemplateColumns: COLS,
                  gap: 10,
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--border)',
                  fontSize: 12.5,
                  color: style.color,
                  fontWeight: style.fontWeight
                }}
              >
                <button
                  onClick={() => onSelectProject(row.project.id)}
                  style={{
                    color: 'inherit',
                    fontWeight: 'inherit',
                    textAlign: 'left',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    fontSize: 'inherit',
                    fontFamily: 'inherit',
                    cursor: 'pointer'
                  }}
                >
                  {row.project.title}
                </button>
                <button
                  onClick={() => setSelectedRowKey(row.key)}
                  style={{
                    color: 'inherit',
                    fontWeight: 'inherit',
                    textAlign: 'left',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    fontSize: 'inherit',
                    fontFamily: 'inherit',
                    textDecoration: 'underline',
                    cursor: 'pointer'
                  }}
                >
                  {row.headline || '—'}
                </button>
                <div>
                  <NameButtons names={mktNames} onPick={setSelectedStaff} />
                </div>
                <div>
                  <NameButtons names={ttthNames} onPick={setSelectedStaff} />
                </div>
                <div>
                  <NameButtons names={stNames} onPick={setSelectedStaff} />
                </div>
                <div>
                  <NameButtons names={dungNames} onPick={setSelectedStaff} />
                </div>
                <div>
                  <ProgressBar percent={row.progress} />
                </div>
                <div>
                  {row.nearestDeadline ? new Date(row.nearestDeadline).toLocaleDateString('vi-VN') : '—'}
                  {diffDays !== null && diffDays < 0 && !row.completed && (
                    <div style={{ color: '#C63C3C', fontWeight: 700, fontSize: 11, marginTop: 2 }}>
                      🚨 ĐÃ QUÁ DEADLINE
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {filteredRows.length === 0 && (
            <div style={{ padding: 16, fontSize: 12.5, color: 'var(--muted)' }}>Không có đầu việc nào.</div>
          )}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: 16
          }}
        >
          {filteredRows.map((row) => {
            const diffDays = row.nearestDeadline ? daysUntil(row.nearestDeadline) : null;
            const style = rowStyle(diffDays, row.completed);
            const mktNames = row.mktStaff ? [{ staff: row.mktStaff }] : [];
            const ttthNames = row.ttthStaff ? [{ staff: row.ttthStaff }] : [];
            const stNames = row.stTasks
              .map((t) => t.st_assignee ?? t.assignee)
              .filter((s): s is Staff => !!s)
              .map((s) => ({ staff: s }));
            const dungNames = row.dungTasks
              .map((t) => t.dung_assignee ?? t.assignee)
              .filter((s): s is Staff => !!s)
              .map((s) => ({ staff: s }));
            return (
              <div
                key={row.key}
                style={{
                  borderRadius: 16,
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  padding: 16,
                  color: style.color,
                  fontWeight: style.fontWeight,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8
                }}
              >
                <button
                  onClick={() => onSelectProject(row.project.id)}
                  style={{ color: 'inherit', fontWeight: 'inherit', textAlign: 'left', background: 'none', border: 'none', padding: 0, fontSize: 13.5, cursor: 'pointer' }}
                >
                  {row.project.title}
                </button>
                <button
                  onClick={() => setSelectedRowKey(row.key)}
                  style={{ color: 'inherit', fontWeight: 'inherit', textAlign: 'left', background: 'none', border: 'none', padding: 0, fontSize: 12, textDecoration: 'underline', cursor: 'pointer' }}
                >
                  {row.headline || '—'}
                </button>
                <div style={{ fontSize: 11, fontWeight: 400 }}>
                  MKT: <NameButtons names={mktNames} onPick={setSelectedStaff} />
                </div>
                <div style={{ fontSize: 11, fontWeight: 400 }}>
                  TTTH: <NameButtons names={ttthNames} onPick={setSelectedStaff} />
                </div>
                <div style={{ fontSize: 11, fontWeight: 400 }}>
                  ST: <NameButtons names={stNames} onPick={setSelectedStaff} />
                </div>
                <div style={{ fontSize: 11, fontWeight: 400 }}>
                  Dựng: <NameButtons names={dungNames} onPick={setSelectedStaff} />
                </div>
                <ProgressBar percent={row.progress} />
                <div style={{ fontSize: 11 }}>
                  {row.nearestDeadline ? new Date(row.nearestDeadline).toLocaleDateString('vi-VN') : '—'}
                  {diffDays !== null && diffDays < 0 && !row.completed && (
                    <div style={{ color: '#C63C3C', fontWeight: 700, fontSize: 11, marginTop: 2 }}>
                      🚨 ĐÃ QUÁ DEADLINE
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {filteredRows.length === 0 && (
            <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Không có đầu việc nào.</div>
          )}
        </div>
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

      {selectedStaff && <StaffInfoModal staff={selectedStaff} onClose={() => setSelectedStaff(null)} />}

      {pipelineOpen && me && (
        <ProjectPipelineModal
          projects={projects}
          allStaff={allStaff}
          departments={departments}
          me={me}
          onClose={() => setPipelineOpen(false)}
          onSaved={() => {
            setPipelineOpen(false);
            onRefetch();
          }}
        />
      )}
    </div>
  );
}
