'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '../../../lib/supabase/client';
import type { Staff, Department, Project, Task, Brief } from '../../../lib/types';
import { canSeeAllStaffAdmin, visibleStaff } from '../../../lib/permissions';
import { buildRows, type WorkRow } from '../../../lib/workRows';
import { DEADLINE_TINT, DEADLINE_VAR, daysUntil, deadlineKey, deadlineText } from '../../../lib/deadlineStatus';
import AddStaffModal from '../../admin/AddStaffModal';

// Giao diện mới — mục "Nhân sự" = trang QUẢN TRỊ NHÂN SỰ cũ (/admin) giữ nguyên toàn bộ
// (chia nhóm theo ban, 5 cột, Thêm nhân sự, Xóa có hỏi lại, phạm vi xem theo quyền, ẩn tài khoản Demo)
// + thêm 4 cột khối lượng việc tính đúng như phần "Theo nhân sự" của Báo cáo tổng hợp.

type StaffRow = Staff & { is_active?: boolean; department: Department | null };

function formatDob(dob: string | null) {
  if (!dob) return '—';
  const d = new Date(dob);
  if (isNaN(d.getTime())) return dob;
  return d.toLocaleDateString('vi-VN');
}

// Giống Báo cáo: nhân sự ban nào thì tính theo đúng vai trò của ban đó trên đầu việc.
// Nhân sự các ban khác (vd Ban Lãnh đạo) thì tính mọi vai trò có tên mình.
function rowHasStaff(r: WorkRow, s: Staff): boolean {
  const dept = s.department?.name;
  const mkt = r.mktStaff?.id === s.id;
  const ttth = r.ttthStaff?.id === s.id;
  const st = r.stTasks.some((t) => t.st_assignee_id === s.id);
  const dung = r.dungTasks.some((t) => t.dung_assignee_id === s.id);
  if (dept === 'Ban Marketing') return mkt;
  if (dept === 'Ban TTTH') return ttth;
  if (dept === 'Ban Sáng tạo') return st;
  if (dept === 'Team Dựng phim') return dung;
  return mkt || ttth || st || dung;
}

const COLS = '1.5fr 0.9fr 0.8fr 1.3fr 1fr 0.75fr 0.65fr 0.85fr 0.65fr 40px';

export default function StaffView({
  me,
  projects,
  tasks,
  briefs,
  departments: allDepartments,
  onSelectProject
}: {
  me: Staff;
  projects: Project[];
  tasks: Task[];
  briefs: Brief[];
  departments: Department[];
  onSelectProject: (id: string) => void;
}) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [staffRows, setStaffRows] = useState<StaffRow[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [error, setError] = useState('');
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StaffRow | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deptFilter, setDeptFilter] = useState('');

  const load = useCallback(async () => {
    const baseQuery = supabase.from('staff').select('*, department:departments(id, name)').eq('is_active', true);
    const { data, error: err } = canSeeAllStaffAdmin(me)
      ? await baseQuery.order('name', { ascending: true })
      : await baseQuery.eq('department_id', me.department_id as string).order('name', { ascending: true });
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    setStaffRows(visibleStaff((data || []) as StaffRow[], me));
    const { data: deptRows } = await supabase.from('departments').select('*').order('name');
    setDepartments((deptRows || []) as Department[]);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me]);

  useEffect(() => {
    load();
  }, [load]);

  async function confirmDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    const { error: delErr } = await supabase.from('staff').update({ is_active: false }).eq('id', target.id);
    if (delErr) {
      setError('Không xóa được: ' + delErr.message);
      return;
    }
    setStaffRows((prev) => prev.filter((r) => r.id !== target.id));
    if (selectedId === target.id) setSelectedId(null);
  }

  const rows = useMemo(() => buildRows(projects, tasks, briefs, allDepartments), [projects, tasks, briefs, allDepartments]);

  const workload = useMemo(() => {
    const map: Record<string, { open: WorkRow[]; total: number; late: number; soon: number; done: number }> = {};
    staffRows.forEach((s) => {
      const mine = rows.filter((r) => rowHasStaff(r, s));
      const open = mine.filter((r) => !r.completed);
      let late = 0;
      let soon = 0;
      open.forEach((r) => {
        if (!r.nearestDeadline) return;
        const d = daysUntil(r.nearestDeadline);
        if (d < 0) late++;
        else if (d <= 3) soon++;
      });
      open.sort((a, b) => {
        if (!a.nearestDeadline) return 1;
        if (!b.nearestDeadline) return -1;
        return new Date(a.nearestDeadline).getTime() - new Date(b.nearestDeadline).getTime();
      });
      map[s.id] = { open, total: mine.length, late, soon, done: mine.length - open.length };
    });
    return map;
  }, [staffRows, rows]);

  const deptNames: string[] = [];
  staffRows.forEach((r) => {
    const label = r.department?.name || 'Chưa phân team';
    if (deptNames.indexOf(label) === -1) deptNames.push(label);
  });

  const groups: { label: string; rows: StaffRow[] }[] = [];
  staffRows.forEach((r) => {
    const label = r.department?.name || 'Chưa phân team';
    if (deptFilter && label !== deptFilter) return;
    let g = groups.find((x) => x.label === label);
    if (!g) {
      g = { label, rows: [] };
      groups.push(g);
    }
    g.rows.push(r);
  });

  const selected = staffRows.find((s) => s.id === selectedId) ?? null;
  const selWork = selected ? workload[selected.id] : null;

  const chip = (on: boolean): React.CSSProperties => ({
    height: 34, padding: '0 12px', borderRadius: 9, fontSize: 12.5, fontWeight: on ? 700 : 500, cursor: 'pointer', whiteSpace: 'nowrap',
    border: '1px solid ' + (on ? 'var(--accent)' : 'var(--border)'), background: on ? 'var(--accent)' : 'var(--surface)',
    color: on ? 'var(--accent-contrast)' : 'var(--text)', fontFamily: 'inherit'
  });
  const num = (n: number, color: string): React.CSSProperties => (n > 0 ? { fontWeight: 700, color } : { color: 'var(--muted)' });

  if (loading) return <div style={{ fontSize: 13.5, color: 'var(--muted)' }}>Đang tải…</div>;

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 4 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: -0.4 }}>Quản lý nhân sự</h1>
        <button
          onClick={() => setShowAddStaff(true)}
          style={{ height: 40, padding: '0 18px', borderRadius: 10, border: 'none', background: 'var(--accent)', color: 'var(--accent-contrast)', fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}
        >
          + Thêm nhân sự
        </button>
      </div>
      <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
        {canSeeAllStaffAdmin(me) ? `${staffRows.length} nhân sự trên toàn hệ thống` : `${staffRows.length} nhân sự của team bạn`}
      </div>

      {deptNames.length > 1 && (
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 18 }}>
          <button onClick={() => setDeptFilter('')} aria-pressed={!deptFilter} style={chip(!deptFilter)}>
            Tất cả
          </button>
          {deptNames.map((d) => (
            <button key={d} onClick={() => setDeptFilter(d)} aria-pressed={deptFilter === d} style={chip(deptFilter === d)}>
              {d}
            </button>
          ))}
        </div>
      )}

      {error && <div style={{ marginBottom: 16, fontSize: 13, color: 'var(--st-red)' }}>{error}</div>}
      {groups.length === 0 && <div style={{ fontSize: 13, color: 'var(--muted)' }}>Chưa có nhân sự nào.</div>}

      {groups.map((g) => (
        <div key={g.label} style={{ marginBottom: 26 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.5, color: 'var(--muted)', textTransform: 'uppercase', margin: '0 0 8px 4px' }}>
            {g.label} · {g.rows.length} người
          </div>
          <div style={{ border: '1px solid var(--border)', borderRadius: 16, background: 'var(--surface)', overflowX: 'auto' }}>
            <div style={{ minWidth: 1060 }}>
              <div
                style={{
                  display: 'grid', gridTemplateColumns: COLS, gap: 10, padding: '11px 16px', borderBottom: '1px solid var(--border)',
                  fontSize: 10.5, fontWeight: 700, color: 'var(--muted)', letterSpacing: 0.3
                }}
              >
                <div>TÊN</div>
                <div>NGÀY SINH</div>
                <div>MÃ NV</div>
                <div>CHỨC VỤ</div>
                <div>SỐ ĐIỆN THOẠI</div>
                <div style={{ color: 'var(--accent-ink)' }}>ĐANG MỞ</div>
                <div style={{ color: 'var(--accent-ink)' }}>TRỄ HẠN</div>
                <div style={{ color: 'var(--accent-ink)' }}>SẮP ĐẾN HẠN</div>
                <div style={{ color: 'var(--accent-ink)' }}>ĐÃ XONG</div>
                <div />
              </div>
              {g.rows.map((st) => {
                const w = workload[st.id];
                return (
                  <div
                    key={st.id}
                    style={{
                      display: 'grid', gridTemplateColumns: COLS, gap: 10, alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid var(--border)',
                      background: selectedId === st.id ? 'var(--chip)' : 'transparent'
                    }}
                  >
                    <button
                      onClick={() => setSelectedId(st.id)}
                      title="Xem việc đang mở"
                      style={{ border: 'none', background: 'none', padding: 0, textAlign: 'left', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: 'var(--text)', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}
                    >
                      {st.name}
                      {(st as { resigned?: boolean }).resigned && <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 700, color: '#C63C3C', background: '#FDECEC', borderRadius: 999, padding: '1px 7px' }}>Đã nghỉ</span>}
                    </button>
                    <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{formatDob(st.date_of_birth)}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{st.employee_id}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{st.position || '—'}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{st.phone || '—'}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                      <b style={{ fontSize: 13.5, color: 'var(--text)' }}>{w ? w.open.length : 0}</b>/{w ? w.total : 0}
                    </div>
                    <div style={{ fontSize: 12.5, ...num(w ? w.late : 0, 'var(--st-red)') }}>{w ? w.late : 0}</div>
                    <div style={{ fontSize: 12.5, ...num(w ? w.soon : 0, 'var(--st-orange)') }}>{w ? w.soon : 0}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{w ? w.done : 0}</div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => setDeleteTarget(st)}
                        aria-label="Xóa nhân sự"
                        style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#C63C3C" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                          <path d="M6 6l12 12M18 6 6 18" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}

      <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>
        * 4 cột Đang mở · Trễ hạn · Sắp đến hạn · Đã xong tính giống phần &quot;Theo nhân sự&quot; của Báo cáo tổng hợp, theo trạng thái lúc xem. Bấm tên để xem việc đang mở.
      </div>

      {selected && selWork && (
        <>
          <div onClick={() => setSelectedId(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(20,20,19,0.3)', zIndex: 120 }} />
          <aside
            aria-label="Việc đang mở của nhân sự"
            style={{
              position: 'fixed', top: 0, right: 0, bottom: 0, width: 400, maxWidth: '100vw', background: 'var(--surface)', color: 'var(--text)',
              borderLeft: '1px solid var(--border)', boxShadow: '-12px 0 40px rgba(20,20,19,0.18)', zIndex: 121, padding: 22, overflowY: 'auto', boxSizing: 'border-box'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{selected.name}</div>
                <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                  {selected.position || '—'} · {selected.department?.name || 'Chưa phân team'}
                </div>
              </div>
              <button onClick={() => setSelectedId(null)} aria-label="Đóng" style={{ width: 34, height: 34, border: 'none', borderRadius: 9, background: 'var(--chip)', color: 'var(--text)', cursor: 'pointer', fontSize: 14 }}>
                ✕
              </button>
            </div>
            <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', fontSize: 12.5, marginBottom: 16 }}>
              {[
                ['Mã nhân viên', selected.employee_id],
                ['Ngày sinh', formatDob(selected.date_of_birth)],
                ['Số điện thoại', selected.phone || '—'],
                ['Phân quyền', selected.permission]
              ].map(([k, v], i) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '9px 12px', borderTop: i === 0 ? 'none' : '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--muted)' }}>{k}</span>
                  <b>{v}</b>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
              Việc đang mở ({selWork.open.length}/{selWork.total}), hạn gần nhất trước
            </div>
            {selWork.open.length === 0 && <div style={{ fontSize: 13, color: 'var(--muted)' }}>Không có việc đang mở.</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {selWork.open.map((r) => {
                const k = deadlineKey(r.nearestDeadline, r.completed);
                return (
                  <button
                    key={r.key}
                    onClick={() => {
                      setSelectedId(null);
                      onSelectProject(r.project.id);
                    }}
                    title="Mở chi tiết dự án"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', textAlign: 'left',
                      fontFamily: 'inherit', color: 'var(--text)', background: `linear-gradient(${DEADLINE_TINT[k]}, ${DEADLINE_TINT[k]}), var(--surface)`
                    }}
                  >
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600 }}>{r.headline || '—'}</span>
                      <span style={{ display: 'block', fontSize: 12, color: 'var(--muted)' }}>{r.project.title}</span>
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: DEADLINE_VAR[k], whiteSpace: 'nowrap' }}>{deadlineText(r.nearestDeadline, r.completed)}</span>
                  </button>
                );
              })}
            </div>
          </aside>
        </>
      )}

      {showAddStaff && (
        <AddStaffModal me={me} departments={departments} onClose={() => setShowAddStaff(false)} onCreated={() => load()} />
      )}

      {deleteTarget && (
        <>
          <div onClick={() => setDeleteTarget(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(20,20,19,0.4)', zIndex: 130 }} />
          <div
            style={{
              position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 320, background: 'var(--surface)', color: 'var(--text)',
              borderRadius: 20, padding: 26, zIndex: 131, boxShadow: '0 24px 60px rgba(20,20,19,0.3)', textAlign: 'center'
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 14.5, marginBottom: 6 }}>{deleteTarget.name}</div>
            <div style={{ fontSize: 13.5, color: 'var(--muted)', marginBottom: 20 }}>Chắc chắn muốn xóa nhân sự này khỏi danh sách?</div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                onClick={() => setDeleteTarget(null)}
                style={{ height: 42, padding: '0 20px', borderRadius: 10, border: 'none', background: 'var(--chip)', color: 'var(--text)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}
              >
                Hủy
              </button>
              <button
                onClick={confirmDelete}
                style={{ height: 42, padding: '0 20px', borderRadius: 10, border: 'none', background: 'var(--st-red)', color: '#FFFFFF', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}
              >
                Đồng ý
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
