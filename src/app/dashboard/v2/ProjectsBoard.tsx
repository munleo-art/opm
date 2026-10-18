'use client';

import { useMemo, useState } from 'react';
import type { Project, Task, Brief, Department, Staff } from '../../../lib/types';
import { buildRows } from '../../../lib/workRows';
import { DEADLINE_TINT, DEADLINE_VAR, deadlineKey, deadlineText, type DeadlineKey } from '../../../lib/deadlineStatus';
import { useIsMobile } from '../../../lib/useIsMobile';

// Giao diện mới — mục "Dự án": mỗi dự án 1 thẻ, chia 4 cột theo ĐÚNG màu deadline của Dashboard.
// Màu của dự án = màu của đầu việc chưa xong có deadline gần nhất (dự án xong hết → xanh lục).

export const GROUP_OPTIONS = ['BĐS Miền Bắc', 'BĐS Miền Trung', 'BĐS Miền Nam', 'SSG', 'SCG', 'KLB'];

const COLUMNS: { key: DeadlineKey; label: string; hint: string }[] = [
  { key: 'red', label: 'Sát / quá deadline', hint: 'Còn ≤1 ngày hoặc đã quá hạn' },
  { key: 'orange', label: 'Gần deadline', hint: 'Còn 2–3 ngày' },
  { key: 'blue', label: 'Chưa đến hạn', hint: 'Còn hơn 3 ngày, hoặc chưa đặt hạn' },
  { key: 'green', label: 'Đã xong', hint: 'Mọi đầu việc đã hoàn thành' }
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface Card {
  project: Project;
  key: DeadlineKey;
  progress: number;
  done: number;
  total: number;
  deadlineLabel: string;
  people: { role: string; staff: Staff }[];
}

export default function ProjectsBoard({
  projects,
  tasks,
  briefs,
  departments,
  group,
  onGroupChange,
  onSelectProject
}: {
  projects: Project[];
  tasks: Task[];
  briefs: Brief[];
  departments: Department[];
  group: string;
  onGroupChange: (g: string) => void;
  onSelectProject: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const isMobile = useIsMobile();
  const rows = useMemo(() => buildRows(projects, tasks, briefs, departments), [projects, tasks, briefs, departments]);

  const cards = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list: Card[] = [];
    for (let i = 0; i < projects.length; i++) {
      const p = projects[i];
      if (group && p.group_name !== group) continue;
      if (q && p.title.toLowerCase().indexOf(q) === -1) continue;
      const pRows = rows.filter((r) => r.project.id === p.id);
      const open = pRows.filter((r) => !r.completed);
      let nearest: string | null = null;
      for (let j = 0; j < open.length; j++) {
        const d = open[j].nearestDeadline;
        if (d && (!nearest || new Date(d).getTime() < new Date(nearest).getTime())) nearest = d;
      }
      const allDone = pRows.length > 0 && open.length === 0;
      const key = deadlineKey(nearest, allDone);
      const progress = pRows.length ? Math.round(pRows.reduce((s, r) => s + r.progress, 0) / pRows.length) : 0;
      const seen: Record<string, boolean> = {};
      const people: { role: string; staff: Staff }[] = [];
      const add = (role: string, s: Staff | null | undefined) => {
        if (!s || seen[s.id]) return;
        seen[s.id] = true;
        people.push({ role, staff: s });
      };
      pRows.forEach((r) => {
        add('MKT', r.mktStaff);
        add('TTTH', r.ttthStaff);
        r.stTasks.forEach((t) => add('Sáng tạo', t.st_assignee ?? t.assignee));
        r.dungTasks.forEach((t) => add('Dựng phim', t.dung_assignee ?? t.assignee));
      });
      list.push({
        project: p,
        key,
        progress,
        done: pRows.length - open.length,
        total: pRows.length,
        deadlineLabel: pRows.length === 0 ? 'Chưa có đầu việc' : deadlineText(nearest, allDone),
        people
      });
    }
    list.sort((a, b) => a.project.title.localeCompare(b.project.title, 'vi'));
    return list;
  }, [projects, rows, group, query]);

  const chip = (on: boolean): React.CSSProperties => ({
    height: 36, padding: '0 14px', borderRadius: 10, fontSize: 13, fontWeight: on ? 700 : 500, cursor: 'pointer', whiteSpace: 'nowrap',
    border: '1px solid ' + (on ? 'var(--accent)' : 'var(--border)'), background: on ? 'var(--accent)' : 'var(--surface)',
    color: on ? 'var(--accent-contrast)' : 'var(--text)', fontFamily: 'inherit'
  });

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 700, letterSpacing: -0.4, margin: '0 0 4px' }}>Dự án</h1>
        <p style={{ fontSize: 13.5, color: 'var(--muted)', margin: 0 }}>
          Màu tính giống hệt Dashboard, theo deadline gần nhất của các đầu việc chưa xong. Bấm vào thẻ để mở chi tiết dự án.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', maxWidth: '100%' }}>
          <button onClick={() => onGroupChange('')} aria-pressed={!group} style={chip(!group)}>
            Tất cả
          </button>
          {GROUP_OPTIONS.map((g) => (
            <button key={g} onClick={() => onGroupChange(g)} aria-pressed={group === g} style={chip(group === g)}>
              {g}
            </button>
          ))}
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Lọc theo tên dự án..."
          aria-label="Lọc theo tên dự án"
          style={{
            marginLeft: isMobile ? 0 : 'auto', height: 36, padding: '0 12px', borderRadius: 9, border: '1px solid var(--border)',
            fontSize: 13, background: 'var(--surface)', color: 'var(--text)', width: isMobile ? '100%' : 220, boxSizing: 'border-box'
          }}
        />
      </div>

      <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(250px, 1fr))', gap: 14, alignItems: 'start', minWidth: 1020 }}>
          {COLUMNS.map((col) => {
            const list = cards.filter((c) => c.key === col.key);
            return (
              <section key={col.key} style={{ background: 'var(--chip)', borderRadius: 14, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ padding: '2px 4px 4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: DEADLINE_VAR[col.key], flexShrink: 0 }} />
                    <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, flex: 1 }}>{col.label}</h2>
                    <span style={{ fontSize: 12, fontWeight: 700, background: 'var(--surface)', borderRadius: 999, padding: '2px 8px' }}>{list.length}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{col.hint}</div>
                </div>
                {list.length === 0 && (
                  <div style={{ fontSize: 12.5, color: 'var(--muted)', textAlign: 'center', padding: '18px 0', border: '1px dashed var(--border)', borderRadius: 10 }}>
                    Không có dự án
                  </div>
                )}
                {list.map((c) => (
                  <button
                    key={c.project.id}
                    onClick={() => onSelectProject(c.project.id)}
                    style={{
                      display: 'flex', flexDirection: 'column', gap: 9, width: '100%', textAlign: 'left', padding: '12px 14px', borderRadius: 12,
                      cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text)', border: '1px solid var(--border)',
                      background: `linear-gradient(${DEADLINE_TINT[c.key]}, ${DEADLINE_TINT[c.key]}), var(--surface)`
                    }}
                  >
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--muted)' }}>{c.project.group_name || '—'}</span>
                    <span style={{ fontSize: 14, fontWeight: 650, lineHeight: 1.35, wordBreak: 'break-word' }}>{c.project.title}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ flex: 1, height: 6, background: 'var(--chip)', borderRadius: 999, overflow: 'hidden' }}>
                        <span style={{ display: 'block', height: '100%', width: `${c.progress}%`, background: DEADLINE_VAR[c.key], borderRadius: 999 }} />
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{c.progress}%</span>
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: DEADLINE_VAR[c.key], background: 'var(--surface)', borderRadius: 999, padding: '3px 9px', whiteSpace: 'nowrap' }}>
                        {c.deadlineLabel}
                      </span>
                      {c.total > 0 && (
                        <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                          <b style={{ color: 'var(--text)' }}>{c.done}</b>/{c.total} đầu việc
                        </span>
                      )}
                    </span>
                    {c.people.length > 0 && (
                      <span style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {c.people.slice(0, 6).map((p) => (
                          <span
                            key={p.staff.id}
                            title={`${p.role}: ${p.staff.name}`}
                            style={{
                              width: 26, height: 26, borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--border)',
                              fontSize: 10.5, fontWeight: 700, color: 'var(--accent-ink)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
                            }}
                          >
                            {initials(p.staff.name)}
                          </span>
                        ))}
                      </span>
                    )}
                  </button>
                ))}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
