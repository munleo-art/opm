'use client';

import { useMemo } from 'react';
import type { Project, Task, Brief, Department, Staff } from '../../../lib/types';
import { buildRows, type WorkRow } from '../../../lib/workRows';
import { DEADLINE_TINT, DEADLINE_VAR, daysUntil, deadlineKey, deadlineText } from '../../../lib/deadlineStatus';
import { canSeeAdmin } from '../../../lib/permissions';
import { useIsMobile } from '../../../lib/useIsMobile';

// Giao diện mới — mục "Tổng quan": tóm tắt nhanh, KHÔNG có dữ liệu mới, mọi con số tính từ đúng
// các đầu việc của Dashboard. Đã bỏ ô "Hoàn thành tuần này" (OPM chưa lưu ngày hoàn thành).

function hasStaff(r: WorkRow, id: string) {
  return (
    r.mktStaff?.id === id ||
    r.ttthStaff?.id === id ||
    r.stTasks.some((t) => (t.st_assignee ?? t.assignee)?.id === id) ||
    r.dungTasks.some((t) => (t.dung_assignee ?? t.assignee)?.id === id)
  );
}

function byDeadline(a: WorkRow, b: WorkRow) {
  if (!a.nearestDeadline && !b.nearestDeadline) return 0;
  if (!a.nearestDeadline) return 1;
  if (!b.nearestDeadline) return -1;
  return new Date(a.nearestDeadline).getTime() - new Date(b.nearestDeadline).getTime();
}

function todayLabel() {
  const d = new Date();
  const days = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  return `${days[d.getDay()]}, ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

export default function OverviewView({
  me,
  projects,
  tasks,
  briefs,
  departments,
  allStaff,
  onOpenProject,
  onGo
}: {
  me: Staff;
  projects: Project[];
  tasks: Task[];
  briefs: Brief[];
  departments: Department[];
  allStaff: Staff[];
  onOpenProject: (id: string) => void;
  onGo: (view: 'dashboard' | 'viectoi' | 'duan' | 'nhansu') => void;
}) {
  const isMobile = useIsMobile();
  const rows = useMemo(() => buildRows(projects, tasks, briefs, departments), [projects, tasks, briefs, departments]);
  const open = rows.filter((r) => !r.completed);
  const overdue = open.filter((r) => r.nearestDeadline && daysUntil(r.nearestDeadline) < 0);
  const next7 = open.filter((r) => {
    if (!r.nearestDeadline) return false;
    const d = daysUntil(r.nearestDeadline);
    return d >= 0 && d <= 7;
  });
  const today = open.filter((r) => r.nearestDeadline && daysUntil(r.nearestDeadline) === 0);
  const openProjects: Record<string, boolean> = {};
  open.forEach((r) => (openProjects[r.project.id] = true));

  const mine = open.filter((r) => hasStaff(r, me.id)).sort(byDeadline);
  const mineSoon = mine.filter((r) => r.nearestDeadline && daysUntil(r.nearestDeadline) <= 1).length;

  const projectProgress = useMemo(() => {
    const list: { p: Project; pct: number; nearest: string | null }[] = [];
    projects.forEach((p) => {
      const pr = rows.filter((r) => r.project.id === p.id);
      const po = pr.filter((r) => !r.completed);
      if (po.length === 0) return;
      let nearest: string | null = null;
      po.forEach((r) => {
        if (r.nearestDeadline && (!nearest || new Date(r.nearestDeadline).getTime() < new Date(nearest).getTime())) nearest = r.nearestDeadline;
      });
      list.push({ p, pct: Math.round(pr.reduce((s, r) => s + r.progress, 0) / pr.length), nearest });
    });
    list.sort((a, b) => {
      if (!a.nearest) return 1;
      if (!b.nearest) return -1;
      return new Date(a.nearest).getTime() - new Date(b.nearest).getTime();
    });
    return list.slice(0, 6);
  }, [projects, rows]);

  const people = useMemo(() => {
    const list: { s: Staff; open: number; total: number; late: number }[] = [];
    allStaff.forEach((s) => {
      const all = rows.filter((r) => hasStaff(r, s.id));
      if (all.length === 0) return;
      const o = all.filter((r) => !r.completed);
      if (o.length === 0) return;
      list.push({ s, open: o.length, total: all.length, late: o.filter((r) => r.nearestDeadline && daysUntil(r.nearestDeadline) < 0).length });
    });
    list.sort((a, b) => b.open - a.open);
    return list.slice(0, 6);
  }, [allStaff, rows]);

  const card: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 20 };
  const link: React.CSSProperties = { border: 'none', background: 'none', padding: 0, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: 'var(--accent-ink)', cursor: 'pointer', textDecoration: 'underline' };
  const firstName = me.name.trim().split(/\s+/).pop();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>{todayLabel()}</div>
        <h1 style={{ margin: '4px 0 0', fontSize: isMobile ? 22 : 28, fontWeight: 700, letterSpacing: -0.4 }}>
          Chào {firstName}, {mine.length === 0 ? 'bạn chưa có việc nào đang mở' : mineSoon > 0 ? `có ${mineSoon} việc của bạn sát hạn` : `bạn đang có ${mine.length} việc mở`}
        </h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        <button onClick={() => onGo('dashboard')} style={{ ...card, textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text)' }}>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>Quá hạn</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--st-red)' }}>{overdue.length}</div>
          <div style={{ fontSize: 12, color: 'var(--st-red)' }}>Đầu việc chưa xong đã quá deadline</div>
        </button>
        <button onClick={() => onGo('dashboard')} style={{ ...card, textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text)' }}>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>Đến hạn 7 ngày tới</div>
          <div style={{ fontSize: 32, fontWeight: 700 }}>{next7.length}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{today.length} việc hạn hôm nay</div>
        </button>
        <button onClick={() => onGo('dashboard')} style={{ ...card, textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text)' }}>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>Đang thực hiện</div>
          <div style={{ fontSize: 32, fontWeight: 700 }}>{open.length}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>Trên {Object.keys(openProjects).length} dự án</div>
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14, alignItems: 'start' }}>
        <section style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>Việc của tôi</h2>
            <button onClick={() => onGo('viectoi')} style={link}>Xem tất cả</button>
          </div>
          {mine.length === 0 && <div style={{ fontSize: 13, color: 'var(--muted)', padding: '10px 0' }}>Không có việc đang mở.</div>}
          {mine.slice(0, 5).map((r) => {
            const k = deadlineKey(r.nearestDeadline, r.completed);
            return (
              <button
                key={r.key}
                onClick={() => onOpenProject(r.project.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '11px 0', border: 'none', borderTop: '1px solid var(--border)', background: 'none', textAlign: 'left', fontFamily: 'inherit', color: 'var(--text)', cursor: 'pointer' }}
              >
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: DEADLINE_VAR[k], flexShrink: 0 }} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 14, fontWeight: 500 }}>{r.headline || '—'}</span>
                  <span style={{ display: 'block', fontSize: 12, color: 'var(--muted)' }}>{r.project.title}</span>
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 999, whiteSpace: 'nowrap', color: DEADLINE_VAR[k], background: DEADLINE_TINT[k] }}>
                  {deadlineText(r.nearestDeadline, r.completed)}
                </span>
              </button>
            );
          })}
        </section>

        <section style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>Tiến độ dự án</h2>
            <button onClick={() => onGo('duan')} style={link}>Mở Dự án</button>
          </div>
          {projectProgress.length === 0 && <div style={{ fontSize: 13, color: 'var(--muted)' }}>Chưa có dự án đang chạy.</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {projectProgress.map(({ p, pct, nearest }) => {
              const k = deadlineKey(nearest, false);
              return (
                <button
                  key={p.id}
                  onClick={() => onOpenProject(p.id)}
                  style={{ display: 'flex', flexDirection: 'column', gap: 6, border: 'none', background: 'none', padding: 0, textAlign: 'left', fontFamily: 'inherit', color: 'var(--text)', cursor: 'pointer' }}
                >
                  <span style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 14 }}>
                    <span style={{ fontWeight: 500 }}>{p.title}</span>
                    <span style={{ color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                      {pct}% · {p.group_name}
                    </span>
                  </span>
                  <span style={{ height: 8, background: 'var(--chip)', borderRadius: 999, overflow: 'hidden' }}>
                    <span style={{ display: 'block', height: '100%', width: `${pct}%`, background: DEADLINE_VAR[k], borderRadius: 999 }} />
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {canSeeAdmin(me) && (
          <section style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>Khối lượng việc theo người</h2>
              <button onClick={() => onGo('nhansu')} style={link}>Mở Nhân sự</button>
            </div>
            {people.length === 0 && <div style={{ fontSize: 13, color: 'var(--muted)' }}>Chưa ai đang cầm việc mở.</div>}
            {people.map((x) => (
              <div key={x.s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: '1px solid var(--border)' }}>
                <span style={{ flex: 1, fontSize: 14 }}>{x.s.name}</span>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                  <b style={{ color: 'var(--text)' }}>{x.open}</b>/{x.total} đang mở
                </span>
                <span
                  style={{
                    fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 999, whiteSpace: 'nowrap',
                    color: x.late > 0 ? 'var(--st-red)' : 'var(--muted)', background: x.late > 0 ? DEADLINE_TINT.red : 'var(--chip)'
                  }}
                >
                  {x.late} trễ hạn
                </span>
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
