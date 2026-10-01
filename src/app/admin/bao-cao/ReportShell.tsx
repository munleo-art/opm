'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '../../../lib/supabase/client';
import type { Staff, Project, Task, Brief, Department } from '../../../lib/types';
import { buildRows, type WorkRow } from '../../../lib/workRows';
import { canSeeAdmin } from '../../../lib/permissions';

const GROUP_OPTIONS = ['BĐS Miền Bắc', 'BĐS Miền Trung', 'BĐS Miền Nam', 'SSG', 'SCG', 'KLB'];

type StatusKey = 'overdue' | 'soon' | 'ontrack' | 'done' | 'none';

interface StatusInfo {
  key: StatusKey;
  label: string;
  color: string;
  bg: string;
}

const STATUS_OPTIONS: { key: StatusKey; label: string }[] = [
  { key: 'overdue', label: '🔴 Trễ hạn' },
  { key: 'soon', label: '🟡 Sắp đến hạn' },
  { key: 'ontrack', label: '🟢 Đúng tiến độ' },
  { key: 'done', label: '✅ Hoàn thành' },
  { key: 'none', label: '⚪ Chưa có đầu việc' }
];

interface ProjectSummary {
  project: Project;
  rows: WorkRow[];
  progress: number;
  nearestDeadline: string | null;
  allCompleted: boolean;
}

function daysUntil(dateStr: string) {
  const d = new Date(dateStr);
  const today = new Date();
  const dOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const tOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((dOnly.getTime() - tOnly.getTime()) / 86400000);
}

function buildProjectSummaries(projects: Project[], rows: WorkRow[]): ProjectSummary[] {
  return projects.map((p) => {
    const pRows = rows.filter((r) => r.project.id === p.id);
    const incomplete = pRows.filter((r) => !r.completed);
    const progress = pRows.length
      ? Math.round(pRows.reduce((sum, r) => sum + r.progress, 0) / pRows.length)
      : 0;
    const deadlineSource = incomplete.length ? incomplete : pRows;
    const deadlineTimes = deadlineSource
      .map((r) => r.nearestDeadline)
      .filter((d): d is string => !!d)
      .map((d) => new Date(d).getTime())
      .sort((a, b) => a - b);
    const allCompleted = pRows.length > 0 && pRows.every((r) => r.completed);
    return {
      project: p,
      rows: pRows,
      progress,
      nearestDeadline: deadlineTimes.length ? new Date(deadlineTimes[0]).toISOString() : null,
      allCompleted
    };
  });
}

function projectStatus(s: ProjectSummary): StatusInfo {
  if (s.rows.length === 0) return { key: 'none', label: '⚪ Chưa có đầu việc', color: 'var(--muted)', bg: 'var(--chip)' };
  if (s.allCompleted) return { key: 'done', label: '✅ Hoàn thành', color: '#2E7D32', bg: 'rgba(46,125,50,0.12)' };
  const d = s.nearestDeadline ? daysUntil(s.nearestDeadline) : null;
  if (d !== null && d < 0) return { key: 'overdue', label: '🔴 Trễ hạn', color: '#C63C3C', bg: 'rgba(198,60,60,0.12)' };
  if (d !== null && d <= 3) return { key: 'soon', label: '🟡 Sắp đến hạn', color: '#C2760B', bg: 'rgba(194,118,11,0.12)' };
  return { key: 'ontrack', label: '🟢 Đúng tiến độ', color: '#2E7D32', bg: 'rgba(46,125,50,0.1)' };
}

type RoleKey = 'mkt' | 'ttth' | 'st' | 'dung';

const ROLE_LABEL: Record<RoleKey, string> = { mkt: 'MKT', ttth: 'TTTH', st: 'ST', dung: 'Dựng' };

// Dự án nạp thẳng vào DB (không qua modal "Thêm dự án") có thể chưa từng được gán phụ trách
// ở CẤP DỰ ÁN (project.mkt_lead_id/...) dù từng đầu việc bên trong đã có người phụ trách rồi.
// Gộp cả 2 nguồn (phụ trách cấp dự án + người được giao ở từng đầu việc) để báo cáo không bao
// giờ hiện trống trong khi Dashboard (vốn chỉ đọc theo đầu việc) vẫn thấy đầy đủ nhân sự.
function roleStaffIds(s: ProjectSummary, role: RoleKey): string[] {
  const ids = new Set<string>();
  const leadId =
    role === 'mkt'
      ? s.project.mkt_lead_id
      : role === 'ttth'
      ? s.project.ttth_lead_id
      : role === 'st'
      ? s.project.sang_tao_lead_id
      : s.project.dung_phim_lead_id;
  if (leadId) ids.add(leadId);
  s.rows.forEach((r) => {
    if (role === 'mkt' && r.mktStaff) ids.add(r.mktStaff.id);
    if (role === 'ttth' && r.ttthStaff) ids.add(r.ttthStaff.id);
    if (role === 'st') r.stTasks.forEach((t) => t.st_assignee_id && ids.add(t.st_assignee_id));
    if (role === 'dung') r.dungTasks.forEach((t) => t.dung_assignee_id && ids.add(t.dung_assignee_id));
  });
  return Array.from(ids);
}

function csvEscape(v: string) {
  const s = v ?? '';
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

export default function ReportShell() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<Staff | null>(null);
  const [allStaff, setAllStaff] = useState<Staff[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [error, setError] = useState('');

  const [groupFilter, setGroupFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusKey | ''>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sheetExporting, setSheetExporting] = useState(false);
  const [sheetError, setSheetError] = useState('');
  const [lastSheetUrl, setLastSheetUrl] = useState('');

  useEffect(() => {
    async function fetchAll() {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login');
        return;
      }

      const { data: meRow } = await supabase
        .from('staff')
        .select('*, department:departments(id, name)')
        .eq('auth_user_id', user.id)
        .single();

      const myRow = meRow as Staff;
      if (!myRow || !canSeeAdmin(myRow)) {
        router.replace('/dashboard');
        return;
      }
      setMe(myRow);

      const [{ data: staffData }, { data: deptData }, { data: projectData }, { data: taskData }, { data: briefData }] =
        await Promise.all([
          supabase.from('staff').select('*, department:departments(id, name)').order('name'),
          supabase.from('departments').select('*'),
          supabase.from('projects').select('*').order('title'),
          supabase
            .from('tasks')
            .select(
              '*, assignee:staff!tasks_assignee_id_fkey(*, department:departments(id, name)), mkt_assignee:staff!tasks_mkt_assignee_id_fkey(*, department:departments(id, name)), st_assignee:staff!tasks_st_assignee_id_fkey(*, department:departments(id, name)), dung_assignee:staff!tasks_dung_assignee_id_fkey(*, department:departments(id, name)), ttth_assignee:staff!tasks_ttth_assignee_id_fkey(*, department:departments(id, name)), checklist_items(*)'
            )
            .order('created_at'),
          supabase
            .from('briefs')
            .select('*, poster:staff!briefs_posted_by_fkey(*, department:departments(id, name))')
            .order('posted_at', { ascending: false })
        ]);

      setAllStaff((staffData as Staff[]) || []);
      setDepartments((deptData as Department[]) || []);
      setProjects((projectData as Project[]) || []);
      setTasks((taskData as Task[]) || []);
      setBriefs((briefData as Brief[]) || []);
      setLoading(false);
    }
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows = useMemo(() => buildRows(projects, tasks, briefs, departments), [projects, tasks, briefs, departments]);
  const summaries = useMemo(() => buildProjectSummaries(projects, rows), [projects, rows]);

  const roleNames = (s: ProjectSummary, role: RoleKey) =>
    roleStaffIds(s, role)
      .map((id) => allStaff.find((st) => st.id === id)?.name)
      .filter((n): n is string => !!n)
      .join(', ');

  const filtered = useMemo(() => {
    return summaries.filter((s) => {
      if (groupFilter && s.project.group_name !== groupFilter) return false;
      if (statusFilter && projectStatus(s).key !== statusFilter) return false;
      return true;
    });
  }, [summaries, groupFilter, statusFilter]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      if (!a.nearestDeadline && !b.nearestDeadline) return a.project.title.localeCompare(b.project.title, 'vi');
      if (!a.nearestDeadline) return 1;
      if (!b.nearestDeadline) return -1;
      return new Date(a.nearestDeadline).getTime() - new Date(b.nearestDeadline).getTime();
    });
    return copy;
  }, [filtered]);

  const totalCount = summaries.length;
  const overdueCount = summaries.filter((s) => projectStatus(s).key === 'overdue').length;
  const soonCount = summaries.filter((s) => projectStatus(s).key === 'soon').length;
  const doneCount = summaries.filter((s) => projectStatus(s).key === 'done').length;

  function buildExportTable() {
    const header = [
      'Dự án',
      'Nhóm',
      'Trạng thái',
      'Deadline gần nhất',
      'Phụ trách MKT',
      'Phụ trách TTTH',
      'Phụ trách Sáng tạo',
      'Phụ trách Dựng phim',
      'Tiến độ (%)'
    ];
    const rows = sorted.map((s) => {
      const status = projectStatus(s);
      return [
        s.project.title,
        s.project.group_name || '',
        status.label.replace(/^[^\s]+\s/, ''),
        s.nearestDeadline ? new Date(s.nearestDeadline).toLocaleDateString('vi-VN') : '',
        roleNames(s, 'mkt'),
        roleNames(s, 'ttth'),
        roleNames(s, 'st'),
        roleNames(s, 'dung'),
        String(s.progress)
      ];
    });
    return { header, rows };
  }

  function todayStamp() {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
      today.getDate()
    ).padStart(2, '0')}`;
  }

  function exportCsv() {
    const { header, rows } = buildExportTable();
    const csv = [header, ...rows].map((r) => r.map(csvEscape).join(',')).join('\r\n');
    const csvWithBom = String.fromCharCode(0xfeff) + csv;
    const blob = new Blob([csvWithBom], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bao-cao-tong-hop-${todayStamp()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function exportToGoogleSheets() {
    const { header, rows } = buildExportTable();
    setSheetExporting(true);
    setSheetError('');
    setLastSheetUrl('');

    // Phải mở tab mới NGAY lúc bấm (đồng bộ, trong user gesture) — nếu đợi fetch xong mới
    // window.open(), nhiều trình duyệt sẽ coi đó là pop-up không phải do người dùng bấm và
    // âm thầm chặn, không báo lỗi gì. Mở tab trống trước rồi nạp link vào sau khi có kết quả.
    const newTab = window.open('', '_blank');
    if (newTab) {
      newTab.document.write(
        '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Đang tạo báo cáo…</title></head>' +
          '<body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;color:#666;margin:0;">Đang tạo Google Sheet, vui lòng đợi…</body></html>'
      );
    }

    try {
      const res = await fetch('/api/export-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Báo cáo tổng hợp ODE - ${todayStamp()}`,
          header,
          rows
        })
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        if (newTab) newTab.close();
        if (data.error === 'not_configured') {
          setSheetError('Chưa cấu hình kết nối Google Sheets. Anh tải CSV tạm nhé, em đang hoàn tất phần này.');
        } else {
          setSheetError('Không tạo được Google Sheet, thử lại sau.');
        }
        return;
      }
      if (newTab) {
        newTab.location.href = data.url;
      } else {
        // Trình duyệt chặn cả tab trống ban đầu — hiện link để anh tự bấm.
        setLastSheetUrl(data.url);
      }
    } catch {
      if (newTab) newTab.close();
      setSheetError('Không kết nối được tới máy chủ, thử lại sau.');
    } finally {
      setSheetExporting(false);
    }
  }

  if (loading) {
    return <div style={{ padding: 40, color: 'var(--muted)', fontSize: 13.5 }}>Đang tải…</div>;
  }
  if (!me) return null;

  return (
    <div style={{ minHeight: '100vh', width: '100%', background: 'var(--bg)', color: 'var(--text)' }}>
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          width: '100%',
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 32px',
            height: 64,
            maxWidth: 1400,
            margin: '0 auto'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link
              href="/admin"
              aria-label="Về trang quản trị"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 36,
                height: 36,
                borderRadius: 9,
                color: 'var(--text)'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </Link>
            <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: 1.2 }}>BÁO CÁO TỔNG HỢP</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {lastSheetUrl && (
              <a
                href={lastSheetUrl}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: 11.5, color: 'var(--accent)', fontWeight: 700, textDecoration: 'underline' }}
              >
                Trình duyệt chặn tab mới — bấm vào đây để mở Sheet
              </a>
            )}
            {sheetError && <div style={{ fontSize: 11.5, color: '#C63C3C', maxWidth: 260 }}>{sheetError}</div>}
            <button
              onClick={exportCsv}
              style={{
                height: 38,
                padding: '0 14px',
                borderRadius: 10,
                border: 'none',
                background: 'transparent',
                color: 'var(--muted)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Tải CSV
            </button>
            <button
              onClick={exportToGoogleSheets}
              disabled={sheetExporting}
              style={{
                height: 38,
                padding: '0 16px',
                borderRadius: 10,
                border: 'none',
                background: 'var(--accent)',
                color: 'var(--accent-contrast)',
                fontSize: 13,
                fontWeight: 700,
                cursor: sheetExporting ? 'default' : 'pointer',
                opacity: sheetExporting ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              {sheetExporting ? 'Đang tạo...' : '📊 Mở Google Sheets'}
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '28px 32px 100px' }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 600 }}>Báo cáo tổng hợp dự án</h1>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>
          Tổng hợp tiến độ tất cả dự án, cập nhật theo thời gian thực từ Dashboard.
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 12,
            marginBottom: 24
          }}
        >
          {[
            { label: 'Tổng số dự án', value: totalCount, color: 'var(--text)' },
            { label: '🔴 Trễ hạn', value: overdueCount, color: '#C63C3C' },
            { label: '🟡 Sắp đến hạn', value: soonCount, color: '#C2760B' },
            { label: '✅ Hoàn thành', value: doneCount, color: '#2E7D32' }
          ].map((card) => (
            <div
              key={card.label}
              style={{
                border: '1px solid var(--border)',
                borderRadius: 16,
                background: 'var(--surface)',
                padding: '16px 18px'
              }}
            >
              <div style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 600, marginBottom: 6 }}>
                {card.label}
              </div>
              <div style={{ fontSize: 26, fontWeight: 700, color: card.color }}>{card.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            style={{ height: 36, padding: '0 10px', borderRadius: 9, border: '1px solid var(--border)', fontSize: 12.5, background: 'var(--surface)' }}
          >
            <option value="">Tất cả nhóm</option>
            {GROUP_OPTIONS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusKey | '')}
            style={{ height: 36, padding: '0 10px', borderRadius: 9, border: '1px solid var(--border)', fontSize: 12.5, background: 'var(--surface)' }}
          >
            <option value="">Tất cả trạng thái</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {error && <div style={{ marginBottom: 16, fontSize: 13, color: '#C63C3C' }}>{error}</div>}

        <div style={{ border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', background: 'var(--surface)' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.6fr 0.9fr 1fr 1fr 1.6fr 1fr 0.5fr',
              gap: 10,
              padding: '11px 16px',
              borderBottom: '1px solid var(--border)',
              fontSize: 10.5,
              fontWeight: 700,
              color: 'var(--muted)',
              letterSpacing: 0.3
            }}
          >
            <div>DỰ ÁN</div>
            <div>NHÓM</div>
            <div>TRẠNG THÁI</div>
            <div>DEADLINE GẦN NHẤT</div>
            <div>PHỤ TRÁCH</div>
            <div>TIẾN ĐỘ</div>
            <div></div>
          </div>

          {sorted.map((s) => {
            const status = projectStatus(s);
            const isExpanded = expandedId === s.project.id;
            const leads = (['mkt', 'ttth', 'st', 'dung'] as RoleKey[])
              .map((role) => ({ role: ROLE_LABEL[role], names: roleNames(s, role) }))
              .filter((l) => l.names);

            return (
              <div key={s.project.id}>
                <div
                  onClick={() => setExpandedId(isExpanded ? null : s.project.id)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.6fr 0.9fr 1fr 1fr 1.6fr 1fr 0.5fr',
                    gap: 10,
                    alignItems: 'center',
                    padding: '12px 16px',
                    borderBottom: isExpanded ? 'none' : '1px solid var(--border)',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{s.project.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{s.project.group_name || '—'}</div>
                  <div>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '3px 10px',
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 700,
                        color: status.color,
                        background: status.bg
                      }}
                    >
                      {status.label}
                    </span>
                  </div>
                  <div style={{ fontSize: 12.5 }}>
                    {s.nearestDeadline ? new Date(s.nearestDeadline).toLocaleDateString('vi-VN') : '—'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {leads.length === 0
                      ? '—'
                      : leads.map((l) => `${l.role}: ${l.names}`).join('  •  ')}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--chip)', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${s.progress}%`,
                          height: '100%',
                          background: s.progress >= 100 ? '#2E7D32' : 'var(--accent)',
                          borderRadius: 3
                        }}
                      />
                    </div>
                    <span style={{ fontSize: 10.5, minWidth: 28, textAlign: 'right' }}>{s.progress}%</span>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--muted)' }}>{isExpanded ? '▲' : '▼'}</div>
                </div>

                {isExpanded && (
                  <div style={{ padding: '0 16px 14px', borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
                    {s.rows.length === 0 ? (
                      <div style={{ fontSize: 12.5, color: 'var(--muted)', padding: '10px 0' }}>Chưa có đầu việc nào.</div>
                    ) : (
                      <div style={{ marginTop: 8 }}>
                        {s.rows.map((r) => {
                          const d = r.nearestDeadline ? daysUntil(r.nearestDeadline) : null;
                          const overdue = !r.completed && d !== null && d < 0;
                          return (
                            <div
                              key={r.key}
                              style={{
                                display: 'grid',
                                gridTemplateColumns: '2fr 1fr 1fr',
                                gap: 10,
                                padding: '8px 0',
                                fontSize: 12,
                                borderBottom: '1px solid var(--border)',
                                color: r.completed ? '#2E7D32' : overdue ? '#C63C3C' : 'var(--text)'
                              }}
                            >
                              <div>{r.headline || '—'}</div>
                              <div>{r.nearestDeadline ? new Date(r.nearestDeadline).toLocaleDateString('vi-VN') : '—'}</div>
                              <div>{r.completed ? 'Hoàn thành' : `${r.progress}%`}</div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {sorted.length === 0 && (
            <div style={{ padding: 16, fontSize: 12.5, color: 'var(--muted)' }}>Không có dự án nào khớp bộ lọc.</div>
          )}
        </div>
      </div>
    </div>
  );
}
