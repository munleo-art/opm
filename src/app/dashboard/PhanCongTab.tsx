'use client';

import { useMemo, useState } from 'react';
import type { Project, Task, Brief, Department, Staff } from '../../lib/types';
import { buildRows } from '../../lib/workRows';
import { useIsMobile } from '../../lib/useIsMobile';
import { isDemoStaff } from '../../lib/permissions';

// Tab PHÂN CÔNG — 1 bảng: BĐS/CORP · Tên dự án/brand · Nhân sự Ban ST · Ban MKT · Ban TTTH.
// Mỗi dòng = 1 nhân sự trên 1 dự án (không gộp ô, không ghép nhiều tên vào 1 ô).
// Dữ liệu tự lấy từ OPM: nhân sự có tên trong ít nhất 1 đầu việc của dự án (tính cả đầu việc đã hoàn thành,
// để quản lý biết ai đã/đang nắm dự án nào khi điều phối)
// (MKT / người đăng brief, TTTH, Sáng tạo) — đúng các đầu việc đang hiện ở Dashboard.
// Mặc định: Xếp theo nhân sự Ban ST (A→Z), mỗi người 1 khối có màu riêng.
// Bấm ▾ ở tiêu đề cột Nhân sự để chọn Xếp theo nhân sự của ban đó, hoặc Xếp theo dự án.

type BanKey = 'st' | 'mkt' | 'ttth';
const BANS: { key: BanKey; label: string }[] = [
  { key: 'st', label: 'NHÂN SỰ BAN ST' },
  { key: 'mkt', label: 'NHÂN SỰ BAN MKT' },
  { key: 'ttth', label: 'NHÂN SỰ BAN TTTH' }
];
const GROUP_ORDER = ['BĐS Miền Bắc', 'BĐS Miền Trung', 'BĐS Miền Nam', 'SSG', 'SCG', 'KLB'];

// Màu khối nhân sự: nền nhạt + chữ đậm cùng tông, cố định không đổi theo theme để luôn dễ đọc.
const PALETTE: [string, string][] = [
  ['#C2E8EC', '#0F2E33'],
  ['#FFEDB0', '#3D3210'],
  ['#F3D6E4', '#3D1729'],
  ['#E9E1D3', '#33291A'],
  ['#FCD9B6', '#3D2A12'],
  ['#D9CFF0', '#24193F'],
  ['#D3EBCB', '#1E3318'],
  ['#C9DAF8', '#0F1F3D'],
  ['#F8D7D7', '#3D1717'],
  ['#EBD9EF', '#341A3A'],
  ['#D6E9F8', '#132A40'],
  ['#F7DFBF', '#3D2A0F'],
  ['#E3EDC9', '#25331A'],
  ['#D8E6E1', '#173328']
];

interface Line {
  key: string;
  group: string;
  projectId: string;
  title: string;
  ban: BanKey;
  staff: Staff;
}

function groupRank(g: string) {
  const i = GROUP_ORDER.indexOf(g);
  return i === -1 ? GROUP_ORDER.length : i;
}

export default function PhanCongTab({
  projects,
  tasks,
  briefs,
  departments,
  allStaff
}: {
  projects: Project[];
  tasks: Task[];
  briefs: Brief[];
  departments: Department[];
  allStaff: Staff[];
}) {
  const isMobile = useIsMobile();
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<BanKey | ''>('st');
  const [menu, setMenu] = useState<BanKey | ''>('');

  const { lines, colorOf } = useMemo(() => {
    const activeIds: Record<string, boolean> = {};
    allStaff.forEach((s) => {
      if ((s as Staff & { is_active?: boolean }).is_active !== false && !isDemoStaff(s)) activeIds[s.id] = true;
    });
    const rows = buildRows(projects, tasks, briefs, departments);
    const seen: Record<string, boolean> = {};
    const out: Line[] = [];
    const add = (s: Staff | null | undefined, ban: BanKey, p: Project) => {
      if (!s || !activeIds[s.id]) return;
      const key = p.id + '|' + ban + '|' + s.id;
      if (seen[key]) return;
      seen[key] = true;
      out.push({ key, group: p.group_name || '—', projectId: p.id, title: p.title, ban, staff: s });
    };
    rows.forEach((r) => {
      r.stTasks.forEach((t) => add(t.st_assignee ?? t.assignee, 'st', r.project));
      add(r.mktStaff, 'mkt', r.project);
      add(r.ttthStaff, 'ttth', r.project);
    });
    const banRank = (b: BanKey) => (b === 'st' ? 0 : b === 'mkt' ? 1 : 2);
    out.sort(
      (a, b) =>
        groupRank(a.group) - groupRank(b.group) ||
        a.title.localeCompare(b.title, 'vi') ||
        banRank(a.ban) - banRank(b.ban) ||
        a.staff.name.localeCompare(b.staff.name, 'vi')
    );
    // Mỗi nhân sự 1 màu cố định (theo tên A→Z)
    const names: string[] = [];
    out.forEach((l) => {
      if (names.indexOf(l.staff.id) === -1) names.push(l.staff.id);
    });
    const byName = out.slice();
    const idsSorted = names
      .map((id) => byName.find((l) => l.staff.id === id)!.staff)
      .sort((a, b) => a.name.localeCompare(b.name, 'vi'))
      .map((s) => s.id);
    const colors: Record<string, [string, string]> = {};
    idsSorted.forEach((id, i) => {
      colors[id] = PALETTE[i % PALETTE.length];
    });
    return { lines: out, colorOf: colors };
  }, [projects, tasks, briefs, departments, allStaff]);

  const q = query.trim().toLowerCase();
  const visible = q ? lines.filter((l) => l.title.toLowerCase().indexOf(q) !== -1) : lines;
  const projectCount = useMemo(() => {
    const ids: Record<string, boolean> = {};
    lines.forEach((l) => (ids[l.projectId] = true));
    return Object.keys(ids).length;
  }, [lines]);

  // Xếp theo nhân sự của 1 ban: mỗi người 1 khối (A→Z), đủ mọi dự án của người đó
  const blocks = useMemo(() => {
    if (!sortBy) return [];
    const order: string[] = [];
    const map: Record<string, Line[]> = {};
    visible
      .filter((l) => l.ban === sortBy)
      .forEach((l) => {
        if (!map[l.staff.id]) {
          map[l.staff.id] = [];
          order.push(l.staff.id);
        }
        map[l.staff.id].push(l);
      });
    return order
      .map((id) => ({ id, name: map[id][0].staff.name, rows: map[id] }))
      .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  }, [visible, sortBy]);

  const COLS = '150px minmax(0,1.6fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)';
  const cellLine = (colored: boolean) => '1px solid ' + (colored ? 'rgba(27,31,36,0.12)' : 'var(--border)');

  const renderRow = (l: Line, i: number, color: [string, string] | null) => (
    <div
      key={l.key}
      style={{
        display: 'grid', gridTemplateColumns: COLS, borderTop: i === 0 ? 'none' : cellLine(!!color),
        background: color ? color[0] : 'transparent', color: color ? color[1] : 'var(--text)', fontSize: 13.5
      }}
    >
      <div style={{ padding: '9px 12px', borderRight: cellLine(!!color) }}>{l.group}</div>
      <div style={{ padding: '9px 12px', fontWeight: 600, borderRight: cellLine(!!color), wordBreak: 'break-word' }}>{l.title}</div>
      <div style={{ padding: '9px 12px', borderRight: cellLine(!!color) }}>{l.ban === 'st' ? l.staff.name : ''}</div>
      <div style={{ padding: '9px 12px', borderRight: cellLine(!!color) }}>{l.ban === 'mkt' ? l.staff.name : ''}</div>
      <div style={{ padding: '9px 12px' }}>{l.ban === 'ttth' ? l.staff.name : ''}</div>
    </div>
  );

  const menuItem = (on: boolean): React.CSSProperties => ({
    display: 'block', width: '100%', textAlign: 'left', padding: '9px 12px', border: 'none', borderRadius: 8, fontFamily: 'inherit',
    fontSize: 13, cursor: 'pointer', color: 'var(--text)', background: on ? 'var(--chip)' : 'transparent', fontWeight: on ? 700 : 500,
    letterSpacing: 0, textTransform: 'none'
  });

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 700, letterSpacing: -0.4, margin: '0 0 4px' }}>Phân công</h1>
        <p style={{ fontSize: 13.5, color: 'var(--muted)', margin: 0 }}>
          Nhân sự nào đã/đang làm dự án nào — tự lấy từ tất cả đầu việc trên OPM (tính cả đã hoàn thành) · {projectCount} dự án
        </p>
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Tìm dự án..."
        aria-label="Tìm dự án"
        style={{
          height: 36, padding: '0 12px', borderRadius: 9, border: '1px solid var(--border)', fontSize: 13, marginBottom: 16,
          background: 'var(--surface)', color: 'var(--text)', width: isMobile ? '100%' : 260, boxSizing: 'border-box'
        }}
      />

      {menu && <div onClick={() => setMenu('')} style={{ position: 'fixed', inset: 0, zIndex: 30 }} />}

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflowX: 'auto' }}>
        <div style={{ minWidth: 900 }}>
          <div
            style={{
              display: 'grid', gridTemplateColumns: COLS, background: 'var(--chip)', borderBottom: '1px solid var(--border)',
              fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: 0.4
            }}
          >
            <div style={{ padding: '11px 12px', borderRight: '1px solid var(--border)' }}>BĐS / CORP</div>
            <div style={{ padding: '11px 12px', borderRight: '1px solid var(--border)' }}>TÊN DỰ ÁN / BRAND</div>
            {BANS.map((b, i) => (
              <div
                key={b.key}
                style={{
                  position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, padding: '6px 6px 6px 12px',
                  borderRight: i < BANS.length - 1 ? '1px solid var(--border)' : 'none', color: sortBy === b.key ? 'var(--accent-ink)' : undefined
                }}
              >
                <span>{b.label}</span>
                <button
                  onClick={() => setMenu(menu === b.key ? '' : b.key)}
                  aria-expanded={menu === b.key}
                  aria-label={'Cách xếp — ' + b.label}
                  style={{
                    width: 28, height: 28, flexShrink: 0, border: '1px solid var(--border)', borderRadius: 7, background: 'var(--surface)',
                    color: 'var(--text)', cursor: 'pointer', fontSize: 11
                  }}
                >
                  ▾
                </button>
                {menu === b.key && (
                  <div
                    role="menu"
                    style={{
                      position: 'absolute', top: 40, right: 6, zIndex: 31, width: 220, background: 'var(--surface)', border: '1px solid var(--border)',
                      borderRadius: 12, boxShadow: '0 14px 34px rgba(20,20,19,0.16)', padding: 6
                    }}
                  >
                    <button
                      role="menuitem"
                      onClick={() => {
                        setSortBy(b.key);
                        setMenu('');
                      }}
                      style={menuItem(sortBy === b.key)}
                    >
                      Xếp theo nhân sự (A → Z)
                    </button>
                    <button
                      role="menuitem"
                      onClick={() => {
                        setSortBy('');
                        setMenu('');
                      }}
                      style={menuItem(!sortBy)}
                    >
                      Xếp theo dự án
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {sortBy ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 10 }}>
              {blocks.map((blk) => (
                <div key={blk.id} style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(27,31,36,0.14)' }}>
                  {blk.rows.map((l, i) => renderRow(l, i, colorOf[l.staff.id]))}
                </div>
              ))}
              {blocks.length === 0 && (
                <div style={{ padding: 6, fontSize: 13.5, color: 'var(--muted)' }}>{q ? 'Không tìm thấy dự án nào khớp.' : 'Ban này hiện chưa có nhân sự nào đang làm dự án.'}</div>
              )}
            </div>
          ) : (
            <div>
              {visible.map((l, i) => renderRow(l, i, null))}
              {visible.length === 0 && <div style={{ padding: 16, fontSize: 13.5, color: 'var(--muted)' }}>Không tìm thấy dự án nào khớp.</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
