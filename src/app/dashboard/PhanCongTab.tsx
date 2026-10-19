'use client';

import { useMemo, useState } from 'react';
import type { Project, Task, Brief, Department, Staff } from '../../lib/types';
import { buildRows } from '../../lib/workRows';
import { useIsMobile } from '../../lib/useIsMobile';
import { isDemoStaff } from '../../lib/permissions';

// Tab PHÂN CÔNG — chỉ hiển thị TÊN DỰ ÁN – TÊN NHÂN SỰ, tự lấy từ dữ liệu OPM.
// Một người "đang làm" 1 dự án khi có tên trong ít nhất 1 đầu việc CHƯA XONG của dự án đó
// (MKT / người đăng brief, TTTH, Sáng tạo) — đúng các đầu việc đang hiện ở Dashboard.
// Áp dụng cho nhân sự Ban Sáng tạo, Ban Marketing, Ban TTTH.

const BANS = ['Ban Sáng tạo', 'Ban Marketing', 'Ban TTTH'];

// Màu ô tên nhân sự: nền nhạt + chữ đậm cùng tông, cố định không đổi theo theme để luôn dễ đọc.
const PALETTE: [string, string][] = [
  ['#F9CB9C', '#3D2A12'],
  ['#C3B5E3', '#24193F'],
  ['#F4CCCC', '#3D1717'],
  ['#D6E9CF', '#1E3318'],
  ['#A9C4F5', '#0F1F3D'],
  ['#9FD8DF', '#0F2E33'],
  ['#FFE59A', '#3D3210'],
  ['#E8D3EC', '#341A3A'],
  ['#CFE3F7', '#132A40'],
  ['#F6D6A8', '#3D2A0F']
];

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
  const [ban, setBan] = useState('');
  const [query, setQuery] = useState('');

  const sections = useMemo(() => {
    const rows = buildRows(projects, tasks, briefs, departments).filter((r) => !r.completed);
    // staffId -> danh sách dự án (không trùng)
    const byStaff: Record<string, { id: string; title: string }[]> = {};
    const add = (s: Staff | null | undefined, p: Project) => {
      if (!s) return;
      const list = byStaff[s.id] || (byStaff[s.id] = []);
      if (!list.some((x) => x.id === p.id)) list.push({ id: p.id, title: p.title });
    };
    rows.forEach((r) => {
      add(r.mktStaff, r.project);
      add(r.ttthStaff, r.project);
      r.stTasks.forEach((t) => add(t.st_assignee ?? t.assignee, r.project));
    });

    let colorIdx = 0;
    return BANS.map((banName) => {
      const people = allStaff
        .filter((s) => s.department?.name === banName && (s as Staff & { is_active?: boolean }).is_active !== false && !isDemoStaff(s))
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, 'vi'))
        .map((s) => {
          const list = (byStaff[s.id] || []).slice().sort((a, b) => a.title.localeCompare(b.title, 'vi'));
          const color = PALETTE[colorIdx++ % PALETTE.length];
          return { staff: s, projects: list, color };
        });
      return { ban: banName, people };
    });
  }, [projects, tasks, briefs, departments, allStaff]);

  // Tìm dự án: chỉ giữ dự án khớp tên, ẩn người không có dự án nào khớp.
  const q = query.trim().toLowerCase();
  const shown = (ban ? sections.filter((s) => s.ban === ban) : sections)
    .map((sec) =>
      q
        ? {
            ...sec,
            people: sec.people
              .map((p) => ({ ...p, projects: p.projects.filter((pr) => pr.title.toLowerCase().indexOf(q) !== -1) }))
              .filter((p) => p.projects.length > 0)
          }
        : sec
    )
    .filter((sec) => !q || sec.people.length > 0);
  const nameCol = isMobile ? 130 : 220;
  const line = '1px solid var(--border)';
  // Đường phân cách giữa 2 nhân sự: đậm hơn hẳn đường giữa các dự án, để nhìn rõ từng người.
  const personLine = '3px solid var(--muted)';

  const chip = (on: boolean): React.CSSProperties => ({
    height: 36, padding: '0 14px', borderRadius: 10, fontSize: 13, fontWeight: on ? 700 : 500, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit',
    border: '1px solid ' + (on ? 'var(--accent)' : 'var(--border)'), background: on ? 'var(--accent)' : 'var(--surface)', color: on ? 'var(--accent-contrast)' : 'var(--text)'
  });

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 700, letterSpacing: -0.4, margin: '0 0 4px' }}>Phân công</h1>
        <p style={{ fontSize: 13.5, color: 'var(--muted)', margin: 0 }}>
          Nhân sự nào đang làm dự án nào — tự lấy từ các đầu việc chưa xong trên OPM.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 18 }}>
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', maxWidth: '100%' }}>
        <button onClick={() => setBan('')} aria-pressed={!ban} style={chip(!ban)}>
          Tất cả
        </button>
        {BANS.map((b) => (
          <button key={b} onClick={() => setBan(b)} aria-pressed={ban === b} style={chip(ban === b)}>
            {b}
          </button>
        ))}
      </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm dự án..."
          aria-label="Tìm dự án"
          style={{
            height: 36, padding: '0 12px', borderRadius: 9, border: '1px solid var(--border)', fontSize: 13,
            background: 'var(--surface)', color: 'var(--text)', width: isMobile ? '100%' : 240, boxSizing: 'border-box'
          }}
        />
      </div>

      {q && shown.length === 0 && <div style={{ fontSize: 13.5, color: 'var(--muted)', marginBottom: 18 }}>Không tìm thấy dự án nào khớp.</div>}

      {shown.map((sec) => (
        <section key={sec.ban} style={{ marginBottom: 26 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, margin: '0 0 8px 2px' }}>
            <h2 style={{ margin: 0, fontSize: 13, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>{sec.ban}</h2>
            <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{sec.people.length} người</span>
          </div>
          {sec.people.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>Ban này chưa có nhân sự.</div>
          ) : (
            <div style={{ background: 'var(--surface)', border: line, borderRadius: 12, overflow: 'hidden', maxWidth: 780 }}>
              <div
                style={{
                  display: 'grid', gridTemplateColumns: `minmax(0, 1fr) ${nameCol}px`, background: 'var(--chip)', borderBottom: line,
                  fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: 0.4
                }}
              >
                <div style={{ padding: '9px 12px', borderRight: line }}>TÊN DỰ ÁN</div>
                <div style={{ padding: '9px 12px' }}>TÊN NHÂN SỰ</div>
              </div>
              {sec.people.map((p, i) => (
                <div key={p.staff.id} style={{ display: 'grid', gridTemplateColumns: `minmax(0, 1fr) ${nameCol}px`, borderTop: i === 0 ? 'none' : personLine }}>
                  <div style={{ display: 'flex', flexDirection: 'column', borderRight: line }}>
                    {p.projects.length === 0 ? (
                      <div style={{ minHeight: 36, padding: '8px 12px', fontSize: 13, color: 'var(--muted)', boxSizing: 'border-box' }}>—</div>
                    ) : (
                      p.projects.map((pr, j) => (
                        <div
                          key={pr.id}
                          style={{ minHeight: 36, padding: '8px 12px', fontSize: 13.5, borderTop: j === 0 ? 'none' : line, boxSizing: 'border-box', wordBreak: 'break-word' }}
                        >
                          {pr.title}
                        </div>
                      ))
                    )}
                  </div>
                  <div
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 10,
                      fontSize: isMobile ? 13 : 14, fontWeight: 600, background: p.color[0], color: p.color[1], wordBreak: 'break-word'
                    }}
                  >
                    {p.staff.name}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
