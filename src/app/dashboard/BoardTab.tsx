'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { createClient } from '../../lib/supabase/client';
import type { Project, Task, Staff } from '../../lib/types';
import { canManageAnyTask, isDemoStaff } from '../../lib/permissions';
import { BOARD_SECTIONS, type BoardKey } from '../../lib/board';
import DatePicker from './DatePicker';

// Tab Q6 / Q9 — bảng theo giai đoạn: PRE-PRODUCTION · SHOOTING · POST-PRODUCTION (Offline v1..n, Online v1..n, Final)
// Mỗi ô (phần · cột · dòng team) có nhiều đầu việc; mỗi đầu việc có 1 tình trạng (chữ đỏ), tick = Hoàn thành.
// Dòng MỤC TIÊU / TÌNH TRẠNG gõ tay theo cột; tình trạng của đầu việc tự đổ về dòng TÌNH TRẠNG, bấm ✕ để xoá.
// PPW: nhiều link (tên văn bản + đường link) cho mỗi cột.

type BoardTask = Task & {
  board_section?: string | null;
  board_col?: string | null;
  board_lane?: string | null;
  status_note?: string | null;
  q69_assignee_id?: string | null;
  mdci_assignee_id?: string | null;
  vphdqt_assignee_id?: string | null;
};
interface Cell { section: string; col: string; goal: string | null; note: string | null }
interface Sec { section: string; off_count: number; on_count: number }
interface Link { id: string; section: string; col: string; title: string; url: string }

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
function splitDeadline(d: string | null | undefined): { date: string; hour: string } {
  if (!d) return { date: '', hour: '09' };
  const dt = new Date(d);
  return {
    date: dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0'),
    hour: String(dt.getHours()).padStart(2, '0')
  };
}
const RED = '#E11D2E';

interface ModalState {
  mode: 'add' | 'edit';
  id?: string;
  section: string;
  col: string;
  lane: string;
  name: string;
  q: string;
  st: string;
  mkt: string;
  mdci: string;
  vp: string;
  date: string;
  hour: string;
}

export default function BoardTab({
  boardKey,
  project,
  tasks,
  allStaff,
  me,
  onRefetch,
  onPatchTask
}: {
  boardKey: BoardKey;
  project: Project | null;
  tasks: Task[];
  allStaff: Staff[];
  me: Staff | null;
  onRefetch: () => void;
  onPatchTask?: (id: string, patch: Record<string, unknown>) => void;
}) {
  const supabase = createClient();
  const PROJ = boardKey === 'q6' ? 'Q6' : 'Q9';
  const canEdit = canManageAnyTask(me);
  const [cells, setCells] = useState<Cell[]>([]);
  const [secs, setSecs] = useState<Sec[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [modal, setModal] = useState<ModalState | null>(null);
  const [pop, setPop] = useState<{ key: string; tid: string; text: string } | null>(null);
  const [linkPop, setLinkPop] = useState<{ key: string; title: string; url: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const pid = project?.id;
  const load = useCallback(async () => {
    if (!pid) return;
    const [c, s, l] = await Promise.all([
      supabase.from('board_cells').select('*').eq('project_id', pid),
      supabase.from('board_sections').select('*').eq('project_id', pid),
      supabase.from('board_links').select('*').eq('project_id', pid).order('created_at')
    ]);
    if (c.error || s.error || l.error) setErr('Chưa đọc được dữ liệu bảng — anh đã chạy SQL tạo bảng Q6/Q9 chưa?');
    else setErr('');
    setCells((c.data as Cell[]) || []);
    setSecs((s.data as Sec[]) || []);
    setLinks((l.data as Link[]) || []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pid]);
  useEffect(() => {
    load();
  }, [load]);

  const pTasks = useMemo(() => (tasks as BoardTask[]).filter((t) => t.project_id === pid), [tasks, pid]);
  const staffById = useMemo(() => {
    const m: Record<string, Staff> = {};
    allStaff.forEach((s) => (m[s.id] = s));
    return m;
  }, [allStaff]);
  const pickable = (dept: string, current?: string) =>
    allStaff
      .filter((s) => s.department?.name === dept)
      .filter((s) => s.id === current || ((s as Staff & { is_active?: boolean }).is_active !== false && !isDemoStaff(s) && !(s as Staff & { resigned?: boolean }).resigned))
      .sort((a, b) => a.name.localeCompare(b.name, 'vi'));

  const LANES: [string, string, string[]][] = [
    ['q', PROJ, ['CREATIVE', '3D']],
    ['ssg', 'SSG', ['CREATIVE', 'MARKETING', 'MDCI', 'VP HĐQT']]
  ];

  const cellOf = (section: string, col: string) => cells.find((c) => c.section === section && c.col === col);
  async function saveCell(section: string, col: string, field: 'goal' | 'note', value: string) {
    if (!pid) return;
    const cur = cellOf(section, col);
    if ((cur?.[field] || '') === value) return;
    const row = { project_id: pid, section, col, goal: field === 'goal' ? value : cur?.goal ?? null, note: field === 'note' ? value : cur?.note ?? null };
    await supabase.from('board_cells').upsert(row, { onConflict: 'project_id,section,col' });
    load();
  }
  async function addVersion(section: string, kind: 'off' | 'on') {
    if (!pid) return;
    const cur = secs.find((s) => s.section === section) || { section, off_count: 2, on_count: 2 };
    const row = { project_id: pid, section, off_count: cur.off_count + (kind === 'off' ? 1 : 0), on_count: cur.on_count + (kind === 'on' ? 1 : 0) };
    await supabase.from('board_sections').upsert(row, { onConflict: 'project_id,section' });
    load();
  }
  // Tình trạng / Hoàn thành: đổi ngay trên màn hình rồi mới ghi xuống DB (không tải lại toàn bộ)
  async function setStatus(taskId: string, text: string) {
    if (onPatchTask) onPatchTask(taskId, { status_note: text || null });
    const { error } = await supabase.from('tasks').update({ status_note: text || null }).eq('id', taskId);
    if (error || !onPatchTask) onRefetch();
  }
  async function toggleDone(t: BoardTask) {
    if (onPatchTask) onPatchTask(t.id, { completed: !t.completed });
    const { error } = await supabase.from('tasks').update({ completed: !t.completed }).eq('id', t.id);
    if (error || !onPatchTask) onRefetch();
  }
  async function addLink(section: string, col: string, title: string, url: string) {
    if (!pid || !url.trim()) return;
    await supabase.from('board_links').insert({ project_id: pid, section, col, title: title.trim() || url.trim(), url: url.trim(), created_by: me?.id ?? null });
    setLinkPop(null);
    load();
  }
  async function delLink(id: string) {
    await supabase.from('board_links').delete().eq('id', id);
    load();
  }
  async function saveTask() {
    if (!modal || !pid || !modal.name.trim()) return;
    setSaving(true);
    const payload = {
      task_name: modal.name.trim(),
      q69_assignee_id: modal.q || null,
      st_assignee_id: modal.st || null,
      mkt_assignee_id: modal.mkt || null,
      mdci_assignee_id: modal.mdci || null,
      vphdqt_assignee_id: modal.vp || null,
      deadline: modal.date ? new Date(modal.date + 'T' + modal.hour + ':00:00').toISOString() : null,
      board_section: modal.section,
      board_col: modal.col,
      board_lane: modal.lane
    };
    if (modal.mode === 'edit' && modal.id) await supabase.from('tasks').update(payload).eq('id', modal.id);
    else await supabase.from('tasks').insert({ ...payload, project_id: pid, created_by: me?.id ?? null });
    setSaving(false);
    setModal(null);
    onRefetch();
  }
  async function deleteTask() {
    if (!modal?.id) return;
    if (typeof window !== 'undefined' && !window.confirm('Xoá đầu việc "' + modal.name + '"?')) return;
    await supabase.from('tasks').delete().eq('id', modal.id);
    setModal(null);
    onRefetch();
  }

  if (!project) {
    return (
      <div style={{ padding: 24, border: '1px solid var(--border)', borderRadius: 14, color: 'var(--muted)', fontSize: 14 }}>
        Chưa có dự án {PROJ} trên OPM — anh chạy SQL tạo dự án {PROJ} giúp em.
      </div>
    );
  }

  const B = 'var(--border)';
  const cellBase: CSSProperties = { boxSizing: 'border-box', borderRight: '1px solid ' + B, borderBottom: '1px solid ' + B, padding: '6px 8px', fontSize: 12.5, minWidth: 0, color: 'var(--text)' };
  const place = (c1: number, c2: number, r1: number, r2: number): CSSProperties => ({ gridColumn: c1 + ' / ' + c2, gridRow: r1 + ' / ' + r2 });
  const labelS: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontWeight: 600, background: 'var(--chip)' };
  const btn: CSSProperties = { border: '1px dashed var(--border)', background: 'var(--surface)', borderRadius: 6, padding: '3px 7px', fontSize: 11.5, fontWeight: 600, color: 'var(--text)', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' };
  const inputS: CSSProperties = { width: '100%', boxSizing: 'border-box', height: 30, border: '1px solid var(--border)', borderRadius: 6, padding: '0 8px', fontSize: 12.5, fontFamily: 'inherit', background: 'var(--surface)', color: 'var(--text)' };
  const shortName = (s?: Staff) => (s ? s.name.split(' - ')[0].split(' ').slice(-2).join(' ') : '');
  const ddmm = (d?: string | null) => {
    if (!d) return '';
    const x = splitDeadline(d);
    return x.date.slice(8, 10) + '/' + x.date.slice(5, 7) + ' ' + x.hour + 'h';
  };
  const unplaced = pTasks.filter((t) => !t.board_section || !t.board_col || !t.board_lane);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--text)' }}>{PROJ}</h2>
        <span style={{ fontSize: 13, color: 'var(--muted)' }}>
          Dự án {PROJ} · nhóm {project.group_name || '—'} · bấm tên đầu việc để sửa / xoá · tick ô vuông = Hoàn thành
        </span>
      </div>
      {err && <div style={{ padding: '10px 12px', borderRadius: 10, background: '#FDECEC', color: RED, fontSize: 13 }}>{err}</div>}

      {BOARD_SECTIONS[boardKey].map((sec) => {
        const v = secs.find((s) => s.section === sec) || { off_count: 2, on_count: 2 };
        const cols: { k: string; t: string; add?: 'off' | 'on' }[] = [{ k: 'pre', t: '' }, { k: 'shoot', t: '' }];
        for (let i = 1; i <= v.off_count; i++) cols.push({ k: 'off' + i, t: 'Offline v' + i, add: i === v.off_count ? 'off' : undefined });
        for (let i = 1; i <= v.on_count; i++) cols.push({ k: 'on' + i, t: 'Online v' + i, add: i === v.on_count ? 'on' : undefined });
        cols.push({ k: 'final', t: 'Final' });
        const NC = cols.length;
        const C0 = 4;
        const out: JSX.Element[] = [];
        const lab = (key: string, txt: string, c1: number, c2: number, r1: number, r2: number, extra?: CSSProperties) =>
          out.push(<div key={key} style={{ ...cellBase, ...place(c1, c2, r1, r2), ...labelS, ...extra }}>{txt}</div>);
        const head = (key: string, txt: string, c1: number, c2: number) =>
          out.push(<div key={key} style={{ ...cellBase, ...place(c1, c2, 1, 2), textAlign: 'center', fontWeight: 800, letterSpacing: 0.3, background: 'var(--chip)' }}>{txt}</div>);
        lab('h0', '', 1, C0, 1, 2, { background: 'var(--surface)' });
        head('h1', 'PRE-PRODUCTION', C0, C0 + 1);
        head('h2', 'SHOOTING', C0 + 1, C0 + 2);
        head('h3', 'POST-PRODUCTION', C0 + 2, C0 + NC);

        // MỤC TIÊU + TÌNH TRẠNG (gõ tay, lưu khi rời ô)
        (['goal', 'note'] as const).forEach((field, fi) => {
          const r = 2 + fi;
          lab('l' + field, field === 'goal' ? 'MỤC TIÊU CẦN ĐẠT ĐƯỢC' : 'TÌNH TRẠNG CÔNG VIỆC', 1, C0, r, r + 1);
          cols.forEach((c, i) => {
            const dk = field + '|' + sec + '|' + c.k;
            const saved = (cellOf(sec, c.k)?.[field] as string) || '';
            const sts = field === 'note' ? pTasks.filter((t) => t.board_section === sec && t.board_col === c.k && t.status_note) : [];
            out.push(
              <div key={dk} style={{ ...cellBase, ...place(C0 + i, C0 + i + 1, r, r + 1), display: 'flex', flexDirection: 'column', gap: 5 }}>
                <input
                  value={draft[dk] ?? saved}
                  disabled={!canEdit}
                  onChange={(e) => setDraft({ ...draft, [dk]: e.target.value })}
                  onBlur={(e) => saveCell(sec, c.k, field, e.target.value)}
                  placeholder={canEdit ? (field === 'goal' ? 'Gõ mục tiêu...' : 'Gõ tình trạng chung...') : ''}
                  style={inputS}
                />
                {sts.map((t) => (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, color: RED, fontWeight: 700, lineHeight: 1.35 }}>
                    <span style={{ flex: 1 }}>⚠ {t.task_name}: {t.status_note}</span>
                    {canEdit && (
                      <button onClick={() => setStatus(t.id, '')} title="Xoá tình trạng" style={{ border: 'none', background: '#FDE2E4', color: RED, borderRadius: 5, width: 20, height: 20, cursor: 'pointer', fontWeight: 800, flex: '0 0 auto' }}>
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            );
          });
        });

        // Tên phiên bản + nút thêm v3, v4…
        lab('sub0', '', 1, C0, 4, 5, { background: 'var(--surface)' });
        cols.forEach((c, i) =>
          out.push(
            <div key={'sub' + c.k} style={{ ...cellBase, ...place(C0 + i, C0 + i + 1, 4, 5), display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontWeight: 600, background: 'var(--chip)' }}>
              <span>{c.t}</span>
              {c.add && canEdit && (
                <button
                  onClick={() => addVersion(sec, c.add!)}
                  title={c.add === 'off' ? 'Thêm Offline v' + (v.off_count + 1) : 'Thêm Online v' + (v.on_count + 1)}
                  style={{ border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 6, width: 22, height: 22, cursor: 'pointer', fontWeight: 800, color: 'var(--text)' }}
                >
                  +
                </button>
              )}
            </div>
          )
        );

        // Dòng team
        let r = 5;
        const laneStart = r;
        LANES.forEach(([gk, gName, lanes]) => {
          lab('g' + gk, gName, 2, 3, r, r + lanes.length, { fontWeight: 800 });
          lanes.forEach((ln) => {
            const lane = gk + '|' + ln;
            lab('ln' + lane, ln, 3, 4, r, r + 1, { fontSize: 12 });
            cols.forEach((c, i) => {
              const key = sec + '|' + c.k + '|' + lane;
              const here = pTasks.filter((t) => t.board_section === sec && t.board_col === c.k && t.board_lane === lane);
              const popOpen = pop?.key === key;
              out.push(
                <div key={'c' + key} style={{ ...cellBase, ...place(C0 + i, C0 + i + 1, r, r + 1), display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {here.map((t) => {
                    const who = [t.q69_assignee_id, t.st_assignee_id, t.mkt_assignee_id, t.mdci_assignee_id, t.vphdqt_assignee_id]
                      .map((id) => (id ? shortName(staffById[id]) : ''))
                      .filter(Boolean)
                      .join(' · ');
                    return (
                      <div key={t.id} style={{ display: 'flex', gap: 7, alignItems: 'flex-start', padding: '6px 7px', borderRadius: 7, background: 'var(--chip)', border: '1px solid var(--border)' }}>
                        <button
                          onClick={() => canEdit && toggleDone(t)}
                          title={t.completed ? 'Bỏ Hoàn thành' : 'Hoàn thành'}
                          style={{
                            width: 15, height: 15, flex: '0 0 auto', borderRadius: 4, cursor: canEdit ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 10, fontWeight: 800, color: '#FFFFFF', marginTop: 1, padding: 0,
                            background: t.completed ? '#2E7D32' : 'var(--surface)', border: t.completed ? '1px solid #2E7D32' : '1.5px solid var(--muted)'
                          }}
                        >
                          {t.completed ? '✓' : ''}
                        </button>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1 }}>
                          <span
                            onClick={() => {
                              if (!canEdit) return;
                              const d = splitDeadline(t.deadline);
                              setModal({ mode: 'edit', id: t.id, section: sec, col: c.k, lane, name: t.task_name || '', q: t.q69_assignee_id || '', st: t.st_assignee_id || '', mkt: t.mkt_assignee_id || '', mdci: t.mdci_assignee_id || '', vp: t.vphdqt_assignee_id || '', date: d.date, hour: d.hour });
                            }}
                            title={canEdit ? 'Bấm để sửa / xoá' : ''}
                            style={{ cursor: canEdit ? 'pointer' : 'default', fontWeight: 600, lineHeight: 1.3, color: t.completed ? 'var(--muted)' : 'var(--text)', textDecoration: t.completed ? 'line-through' : 'none' }}
                          >
                            {t.task_name}
                          </span>
                          {t.status_note && <span style={{ color: RED, fontWeight: 700, fontSize: 11.5 }}>⚠ {t.status_note}</span>}
                          {who && <span style={{ color: 'var(--muted)', fontSize: 11 }}>{who}</span>}
                          {t.deadline && <span style={{ color: 'var(--muted)', fontSize: 11 }}>{ddmm(t.deadline)}</span>}
                        </div>
                      </div>
                    );
                  })}
                  {popOpen && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: 7, borderRadius: 7, border: '1px solid #F3B4B4', background: '#FFF5F5' }}>
                      {here.length === 0 ? (
                        <span style={{ fontSize: 11.5, color: '#8A3B2E' }}>Ô này chưa có đầu việc — thêm đầu việc trước.</span>
                      ) : (
                        <>
                          {here.length > 1 && (
                            <select value={pop!.tid} onChange={(e) => setPop({ ...pop!, tid: e.target.value })} style={inputS}>
                              {here.map((t) => (
                                <option key={t.id} value={t.id}>{t.task_name}</option>
                              ))}
                            </select>
                          )}
                          <div style={{ display: 'flex', gap: 5 }}>
                            <input
                              autoFocus
                              value={pop!.text}
                              onChange={(e) => setPop({ ...pop!, text: e.target.value })}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && pop!.text.trim()) {
                                  setStatus(pop!.tid, pop!.text.trim());
                                  setPop(null);
                                }
                              }}
                              placeholder="VD: Tạm dừng, Đang chờ duyệt Chủ tịch..."
                              style={inputS}
                            />
                            <button
                              onClick={() => {
                                if (!pop!.text.trim()) return;
                                setStatus(pop!.tid, pop!.text.trim());
                                setPop(null);
                              }}
                              title="Thêm tình trạng"
                              style={{ border: 'none', background: RED, color: '#FFFFFF', borderRadius: 6, width: 30, flex: '0 0 auto', cursor: 'pointer', fontWeight: 800, fontSize: 16 }}
                            >
                              +
                            </button>
                          </div>
                        </>
                      )}
                      <button onClick={() => setPop(null)} style={{ alignSelf: 'flex-end', border: 'none', background: 'transparent', fontSize: 11.5, color: '#5B6470', cursor: 'pointer', fontFamily: 'inherit' }}>
                        Đóng
                      </button>
                    </div>
                  )}
                  {canEdit && (
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      <button onClick={() => setModal({ mode: 'add', section: sec, col: c.k, lane, name: '', q: '', st: '', mkt: '', mdci: '', vp: '', date: '', hour: '09' })} style={btn}>
                        + Thêm đầu việc
                      </button>
                      <button onClick={() => setPop({ key, tid: here.length ? here[0].id : '', text: '' })} style={btn}>
                        + Thêm tình trạng
                      </button>
                    </div>
                  )}
                </div>
              );
            });
            r++;
          });
        });
        lab('sec', sec, 1, 2, laneStart, r, { fontWeight: 800, fontSize: 14, background: 'var(--surface)' });

        // PPW
        lab('ppw', 'PPW', 2, 4, r, r + 1, { fontWeight: 800 });
        cols.forEach((c, i) => {
          const key = sec + '|' + c.k;
          const lp = linkPop?.key === key;
          out.push(
            <div key={'ppw' + key} style={{ ...cellBase, ...place(C0 + i, C0 + i + 1, r, r + 1), display: 'flex', flexDirection: 'column', gap: 5 }}>
              {links
                .filter((l) => l.section === sec && l.col === c.k)
                .map((l) => (
                  <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <a href={l.url} target="_blank" rel="noreferrer" style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600, color: 'var(--accent-ink, var(--accent))' }}>
                      🔗 {l.title}
                    </a>
                    {canEdit && (
                      <button onClick={() => delLink(l.id)} title="Xoá link" style={{ border: 'none', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontWeight: 800 }}>
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              {lp && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: 7, borderRadius: 7, border: '1px solid var(--border)', background: 'var(--chip)' }}>
                  <input value={linkPop!.title} onChange={(e) => setLinkPop({ ...linkPop!, title: e.target.value })} placeholder="Tên văn bản" style={inputS} />
                  <input value={linkPop!.url} onChange={(e) => setLinkPop({ ...linkPop!, url: e.target.value })} placeholder="Dán đường link..." style={inputS} />
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <button onClick={() => setLinkPop(null)} style={{ border: 'none', background: 'transparent', fontSize: 12, color: 'var(--muted)', cursor: 'pointer', fontFamily: 'inherit' }}>
                      Huỷ
                    </button>
                    <button onClick={() => addLink(sec, c.k, linkPop!.title, linkPop!.url)} style={{ border: 'none', background: 'var(--accent)', color: 'var(--accent-contrast)', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                      Lưu link
                    </button>
                  </div>
                </div>
              )}
              {canEdit && (
                <div>
                  <button onClick={() => setLinkPop({ key, title: '', url: '' })} style={btn}>
                    + Link
                  </button>
                </div>
              )}
            </div>
          );
        });

        return (
          <div key={sec} style={{ overflowX: 'auto', borderRadius: 10 }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '110px 70px 104px repeat(' + NC + ', minmax(210px, 1fr))',
                borderTop: '1px solid ' + B,
                borderLeft: '1px solid ' + B,
                minWidth: 284 + NC * 210,
                background: 'var(--surface)'
              }}
            >
              {out}
            </div>
          </div>
        );
      })}

      {unplaced.length > 0 && (
        <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>
          Đầu việc của dự án {PROJ} chưa xếp vào ô nào (tạo từ chỗ khác): {unplaced.map((t) => t.task_name).join(', ')}
        </div>
      )}

      {modal && (
        <div>
          <div onClick={() => setModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(20,20,19,0.45)', zIndex: 140 }} />
          <div
            style={{
              position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 440, maxWidth: '92vw', maxHeight: '88vh', overflowY: 'auto',
              background: 'var(--surface)', color: 'var(--text)', borderRadius: 20, padding: 24, zIndex: 141, display: 'flex', flexDirection: 'column', gap: 12, boxSizing: 'border-box'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{modal.mode === 'edit' ? 'Sửa đầu việc' : 'Thêm đầu việc'}</h3>
              <button onClick={() => setModal(null)} style={{ border: 'none', background: 'transparent', fontSize: 16, cursor: 'pointer', color: 'var(--text)' }}>
                ✕
              </button>
            </div>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>
              {modal.section} · {modal.lane.split('|')[0] === 'q' ? PROJ : 'SSG'} · {modal.lane.split('|')[1]}
            </span>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11.5, fontWeight: 600, color: 'var(--muted)' }}>
              Tên đầu việc
              <input value={modal.name} onChange={(e) => setModal({ ...modal, name: e.target.value })} placeholder="Nhập tên đầu việc..." style={{ ...inputS, height: 40 }} />
            </label>
            {(
              [
                ['Nhân sự ' + PROJ, 'q', 'Q6-Q9'],
                ['Nhân sự Ban ST', 'st', 'Ban Sáng tạo'],
                ['Nhân sự MKT', 'mkt', 'Ban Marketing'],
                ['Nhân sự MDCI', 'mdci', 'MDCI'],
                ['Nhân sự VP HĐQT', 'vp', 'VP HĐQT']
              ] as [string, 'q' | 'st' | 'mkt' | 'mdci' | 'vp', string][]
            ).map(([label, k, dept]) => (
              <label key={k} style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11.5, fontWeight: 600, color: 'var(--muted)' }}>
                {label}
                <select value={modal[k]} onChange={(e) => setModal({ ...modal, [k]: e.target.value })} style={{ ...inputS, height: 40 }}>
                  <option value="">— Chưa chọn —</option>
                  {pickable(dept, modal[k]).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11.5, fontWeight: 600, color: 'var(--muted)' }}>
              Deadline
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <DatePicker value={modal.date} onChange={(v) => setModal({ ...modal, date: v })} placeholder="Chọn ngày" />
                </div>
                <select value={modal.hour} onChange={(e) => setModal({ ...modal, hour: e.target.value })} style={{ ...inputS, height: 40, flex: 1 }}>
                  {HOURS.map((h) => (
                    <option key={h} value={h}>
                      {h}:00
                    </option>
                  ))}
                </select>
              </div>
            </label>
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              {modal.mode === 'edit' && (
                <button onClick={deleteTask} title="Xoá đầu việc" style={{ width: 56, height: 42, border: '1px solid var(--border)', borderRadius: 10, background: 'transparent', color: '#C63C3C', fontSize: 18, cursor: 'pointer' }}>
                  ✕
                </button>
              )}
              <button
                onClick={saveTask}
                disabled={!modal.name.trim() || saving}
                style={{
                  flex: 1, height: 42, border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, fontFamily: 'inherit', cursor: modal.name.trim() ? 'pointer' : 'default',
                  background: modal.name.trim() ? 'var(--accent)' : 'var(--border)', color: modal.name.trim() ? 'var(--accent-contrast)' : 'var(--muted)'
                }}
              >
                {saving ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
