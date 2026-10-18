'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '../../../lib/supabase/client';
import type { Staff, Project, Task, Brief, Department, NotificationRow } from '../../../lib/types';
import { buildRows } from '../../../lib/workRows';
import { daysUntil } from '../../../lib/deadlineStatus';
import { canAddProject, canSeeAdmin } from '../../../lib/permissions';
import { useIsMobile } from '../../../lib/useIsMobile';
import type { UiVersion } from '../../../lib/uiVersion';
import DashboardTab from '../DashboardTab';
import CalendarTab from '../CalendarTab';
import NotesTab from '../NotesTab';
import AccountTab from '../AccountTab';
import ThemeControls from '../ThemeControls';
import LogoutButton from '../LogoutButton';
import Avatar from '../Avatar';
import ProjectPipelineModal from '../ProjectPipelineModal';
import ReportShell from '../../admin/bao-cao/ReportShell';
import OverviewView from './OverviewView';
import ProjectsBoard, { GROUP_OPTIONS } from './ProjectsBoard';
import StaffView from './StaffView';

// GIAO DIỆN MỚI (bật trong bảng "Giao diện" → Kiểu giao diện → Giao diện mới).
// Chỉ thay KHUNG (menu trái). Dashboard, Lịch, Ghi chú, Tài khoản, Báo cáo dùng lại đúng component
// của giao diện cũ nên mọi tính năng giữ nguyên. Giao diện cũ không bị sửa.

export type ViewKey = 'dashboard' | 'calendar' | 'ghichu' | 'tongquan' | 'viectoi' | 'duan' | 'nhansu' | 'baocao' | 'taikhoan';

function relativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
}

const Icon = {
  dashboard: <path d="M3 6h18M3 12h18M3 18h18" />,
  tongquan: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </>
  ),
  viectoi: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M8 12l3 3 5-6" />
    </>
  ),
  duan: <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
  nhansu: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a5.5 5.5 0 0 1 3.5 6" />
    </>
  ),
  baocao: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  bell: (
    <>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </>
  )
};

function Svg({ children, size = 20 }: { children?: React.ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
      {children}
    </svg>
  );
}

export default function NewShell({
  me,
  allStaff,
  departments,
  projects,
  tasks,
  briefs,
  notifications,
  onRefetch,
  onSelectProject,
  uiVersion,
  onChangeUi,
  children
}: {
  me: Staff;
  allStaff: Staff[];
  departments: Department[];
  projects: Project[];
  tasks: Task[];
  briefs: Brief[];
  notifications: NotificationRow[];
  onRefetch: () => void;
  onSelectProject: (id: string) => void;
  uiVersion: UiVersion;
  onChangeUi: (v: UiVersion) => void;
  children?: React.ReactNode;
}) {
  const isMobile = useIsMobile();
  const [view, setView] = useState<ViewKey>('dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [group, setGroup] = useState('');
  const [search, setSearch] = useState('');
  const [externalQuery, setExternalQuery] = useState<{ text: string; at: number } | undefined>(undefined);

  const isAdminView = canSeeAdmin(me);
  const canCreate = canAddProject(me);
  const expanded = isMobile ? true : !collapsed;

  // Không đủ quyền thì không vào được Nhân sự / Báo cáo.
  useEffect(() => {
    if (!isAdminView && (view === 'nhansu' || view === 'baocao')) setView('dashboard');
  }, [isAdminView, view]);

  const rows = useMemo(() => buildRows(projects, tasks, briefs, departments), [projects, tasks, briefs, departments]);
  const overdueCount = rows.filter((r) => !r.completed && r.nearestDeadline && daysUntil(r.nearestDeadline) < 0).length;
  const myOpenCount = rows.filter(
    (r) =>
      !r.completed &&
      (r.mktStaff?.id === me.id ||
        r.ttthStaff?.id === me.id ||
        r.stTasks.some((t) => (t.st_assignee ?? t.assignee)?.id === me.id) ||
        r.dungTasks.some((t) => (t.dung_assignee ?? t.assignee)?.id === me.id))
  ).length;

  const sortedNotifs = notifications
    .slice()
    .sort((a, b) => new Date(b.notification?.created_at ?? 0).getTime() - new Date(a.notification?.created_at ?? 0).getTime());
  const unreadCount = notifications.filter((n) => !n.read_at).length;

  async function toggleNotif() {
    const opening = !notifOpen;
    setNotifOpen(opening);
    if (opening && unreadCount > 0) {
      const unreadIds = notifications.filter((n) => !n.read_at).map((n) => n.notification_id);
      await createClient().from('notification_recipients').update({ read_at: new Date().toISOString() }).in('notification_id', unreadIds);
      onRefetch();
    }
  }

  function go(v: ViewKey) {
    setView(v);
    setDrawerOpen(false);
    setNotifOpen(false);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
  }

  const inTabs = view === 'dashboard' || view === 'calendar' || view === 'ghichu';

  const item = (on: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 12, width: '100%', minHeight: 42, padding: expanded ? '0 12px' : 0,
    justifyContent: expanded ? 'flex-start' : 'center', border: 'none', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
    fontSize: 14, textAlign: 'left', boxSizing: 'border-box',
    background: on ? 'var(--chip)' : 'transparent', color: on ? 'var(--accent-ink)' : 'var(--text)', fontWeight: on ? 700 : 500
  });
  const badge = (tone: 'red' | 'accent'): React.CSSProperties => ({
    fontSize: 11, fontWeight: 700, borderRadius: 999, padding: '2px 8px', whiteSpace: 'nowrap',
    background: tone === 'red' ? 'rgba(198,60,60,0.12)' : 'var(--chip)', color: tone === 'red' ? 'var(--st-red)' : 'var(--accent-ink)'
  });
  const sectionLabel: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: 0.6, padding: '10px 12px 4px' };

  const sidebar = (
    <nav
      aria-label="Menu chính"
      style={{
        width: expanded ? 264 : 76, flexShrink: 0, boxSizing: 'border-box', background: 'var(--surface)', borderRight: '1px solid var(--border)',
        padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 12, height: '100vh', position: isMobile ? 'relative' : 'sticky', top: 0,
        overflowY: 'auto', overflowX: 'visible'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: expanded ? 'space-between' : 'center', gap: 8, padding: '2px 2px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div style={{ width: 36, height: 36, borderRadius: 11, background: 'var(--accent)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-contrast)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="7.5" />
              <path d="M9 12l2 2 4-4" />
            </svg>
          </div>
          {expanded && (
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14.5, fontWeight: 700, whiteSpace: 'nowrap' }}>ODE Project Manager</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {me.department?.name} · {me.permission}
              </div>
            </div>
          )}
        </div>
        {!isMobile && expanded && (
          <button onClick={() => setCollapsed(true)} aria-label="Thu gọn menu" title="Thu gọn menu" style={{ width: 32, height: 32, border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 8, cursor: 'pointer', color: 'var(--muted)', flexShrink: 0 }}>
            «
          </button>
        )}
        {isMobile && (
          <button onClick={() => setDrawerOpen(false)} aria-label="Đóng menu" style={{ width: 36, height: 36, border: 'none', background: 'var(--chip)', borderRadius: 9, cursor: 'pointer', color: 'var(--text)' }}>
            ✕
          </button>
        )}
      </div>
      {!isMobile && !expanded && (
        <button onClick={() => setCollapsed(false)} aria-label="Mở rộng menu" title="Mở rộng menu" style={{ height: 32, border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 8, cursor: 'pointer', color: 'var(--muted)' }}>
          »
        </button>
      )}

      {canCreate && (
        <button
          onClick={() => {
            setCreateOpen(true);
            setDrawerOpen(false);
          }}
          title="Thêm công việc mới"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 44, border: 'none', borderRadius: 10,
            background: 'var(--accent)', color: 'var(--accent-contrast)', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit'
          }}
        >
          <span style={{ fontSize: 18, lineHeight: 1 }}>+</span>
          {expanded && <span>Tạo việc</span>}
        </button>
      )}

      {expanded && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setExternalQuery({ text: search, at: Date.now() });
            go('dashboard');
          }}
          role="search"
        >
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setExternalQuery({ text: e.target.value, at: Date.now() });
              if (!inTabs || view !== 'dashboard') setView('dashboard');
            }}
            placeholder="Tìm tên dự án..."
            aria-label="Tìm tên dự án"
            style={{ width: '100%', boxSizing: 'border-box', height: 40, padding: '0 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13 }}
          />
        </form>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {expanded && <div style={sectionLabel}>LÀM VIỆC</div>}
        <button onClick={() => go('dashboard')} aria-current={inTabs ? 'page' : undefined} title="Dashboard" style={item(inTabs)}>
          <Svg>{Icon.dashboard}</Svg>
          {expanded && <span style={{ flex: 1 }}>Dashboard</span>}
          {expanded && overdueCount > 0 && <span style={badge('red')}>{overdueCount} quá hạn</span>}
        </button>
        <button onClick={() => go('tongquan')} aria-current={view === 'tongquan' ? 'page' : undefined} title="Tổng quan" style={item(view === 'tongquan')}>
          <Svg>{Icon.tongquan}</Svg>
          {expanded && <span style={{ flex: 1 }}>Tổng quan</span>}
        </button>
        <button onClick={() => go('viectoi')} aria-current={view === 'viectoi' ? 'page' : undefined} title="Việc của tôi" style={item(view === 'viectoi')}>
          <Svg>{Icon.viectoi}</Svg>
          {expanded && <span style={{ flex: 1 }}>Việc của tôi</span>}
          {expanded && myOpenCount > 0 && <span style={badge('accent')}>{myOpenCount}</span>}
        </button>
        <button
          onClick={() => {
            setGroup('');
            go('duan');
          }}
          aria-current={view === 'duan' ? 'page' : undefined}
          title="Dự án"
          style={item(view === 'duan' && !group)}
        >
          <Svg>{Icon.duan}</Svg>
          {expanded && <span style={{ flex: 1 }}>Dự án</span>}
        </button>
        {expanded && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, padding: '0 0 4px 32px' }}>
            {GROUP_OPTIONS.map((g) => {
              const on = view === 'duan' && group === g;
              return (
                <button
                  key={g}
                  onClick={() => {
                    setGroup(g);
                    go('duan');
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
                    fontSize: 13, textAlign: 'left', background: on ? 'var(--chip)' : 'transparent', color: on ? 'var(--accent-ink)' : 'var(--muted)', fontWeight: on ? 700 : 500
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', opacity: 0.6 }} />
                  {g}
                </button>
              );
            })}
          </div>
        )}

        {isAdminView && (
          <>
            {expanded && <div style={sectionLabel}>QUẢN LÝ</div>}
            <button onClick={() => go('nhansu')} aria-current={view === 'nhansu' ? 'page' : undefined} title="Nhân sự" style={item(view === 'nhansu')}>
              <Svg>{Icon.nhansu}</Svg>
              {expanded && <span style={{ flex: 1 }}>Nhân sự</span>}
            </button>
            <button onClick={() => go('baocao')} aria-current={view === 'baocao' ? 'page' : undefined} title="Báo cáo" style={item(view === 'baocao')}>
              <Svg>{Icon.baocao}</Svg>
              {expanded && <span style={{ flex: 1 }}>Báo cáo</span>}
            </button>
          </>
        )}
      </div>

      <div style={{ flex: 1 }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, borderTop: '1px solid var(--border)', paddingTop: 10, position: 'relative' }}>
        <button onClick={toggleNotif} aria-expanded={notifOpen} title="Thông báo" style={item(notifOpen)}>
          <span style={{ position: 'relative', display: 'inline-flex' }}>
            <Svg>{Icon.bell}</Svg>
            {unreadCount > 0 && <span style={{ position: 'absolute', top: -2, right: -2, width: 8, height: 8, borderRadius: '50%', background: 'var(--st-red)', border: '1.5px solid var(--surface)' }} />}
          </span>
          {expanded && <span style={{ flex: 1 }}>Thông báo</span>}
          {expanded && unreadCount > 0 && <span style={badge('red')}>{unreadCount}</span>}
        </button>

        {notifOpen && (
          <>
            <div onClick={() => setNotifOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 59 }} />
            <div
              role="dialog"
              aria-label="Thông báo"
              style={{
                position: isMobile ? 'fixed' : 'absolute', ...(isMobile ? { left: 12, right: 12, bottom: 90 } : { left: expanded ? 252 : 64, bottom: 40 }),
                width: isMobile ? 'auto' : 340, maxHeight: 420, overflowY: 'auto', background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 16, boxShadow: '0 16px 40px rgba(20,20,19,0.18)', padding: 8, zIndex: 60, color: 'var(--text)'
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', color: 'var(--muted)', padding: '10px 10px 6px' }}>Thông báo</div>
              {sortedNotifs.length === 0 && <div style={{ padding: '24px 10px', textAlign: 'center', fontSize: 12.5, color: 'var(--muted)' }}>Chưa có thông báo nào.</div>}
              {sortedNotifs.map((n) => (
                <button
                  key={n.notification_id}
                  onClick={() => {
                    setNotifOpen(false);
                    setDrawerOpen(false);
                    if (n.notification?.project_id) onSelectProject(n.notification.project_id);
                  }}
                  style={{ display: 'flex', width: '100%', textAlign: 'left', gap: 10, padding: 10, border: 'none', background: 'transparent', borderRadius: 10, cursor: 'pointer', color: 'var(--text)', fontFamily: 'inherit' }}
                >
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: n.read_at ? 'transparent' : 'var(--accent)', marginTop: 6, flexShrink: 0 }} />
                  <span style={{ flexGrow: 1 }}>
                    <span style={{ display: 'block', fontSize: 13, fontWeight: 700 }}>{n.notification?.title}</span>
                    <span style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginTop: 2, lineHeight: 1.4 }}>{n.notification?.detail}</span>
                    <span style={{ display: 'block', fontSize: 10.5, color: 'var(--muted-2)', marginTop: 4 }}>
                      {n.notification?.created_at ? relativeTime(n.notification.created_at) : ''}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: expanded ? '2px 4px' : 0, justifyContent: expanded ? 'flex-start' : 'center', flexWrap: 'wrap' }}>
          {expanded && <span style={{ fontSize: 13, color: 'var(--muted)', flex: 1 }}>Giao diện</span>}
          <ThemeControls popAlign="left" popDir="up" uiVersion={uiVersion} onChangeUi={onChangeUi} />
        </div>

        <button onClick={() => go('taikhoan')} aria-current={view === 'taikhoan' ? 'page' : undefined} title="Tài khoản" style={{ ...item(view === 'taikhoan'), padding: expanded ? '6px 8px' : '6px 0' }}>
          <Avatar me={me} size={34} />
          {expanded && (
            <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
              <span style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{me.name}</span>
              <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 400 }}>Tài khoản</span>
            </span>
          )}
        </button>
        {expanded && (
          <div style={{ padding: '2px 4px' }}>
            <LogoutButton />
          </div>
        )}
      </div>
    </nav>
  );

  const tabRow = (
    <nav aria-label="Dashboard, Lịch, Ghi chú" className="ode-tabs" style={{ display: 'inline-flex', gap: 4, background: 'var(--chip)', padding: 4, borderRadius: 12, marginBottom: 22 }}>
      {(
        [
          ['dashboard', 'Dashboard'],
          ['calendar', 'Lịch'],
          ['ghichu', 'Ghi chú']
        ] as [ViewKey, string][]
      ).map(([key, label]) => (
        <button
          key={key}
          onClick={() => setView(key)}
          aria-current={view === key ? 'page' : undefined}
          style={{
            height: 36, padding: '0 18px', borderRadius: 9, border: 'none', fontFamily: 'inherit', fontSize: 14, cursor: 'pointer',
            background: view === key ? 'var(--surface)' : 'transparent', color: view === key ? 'var(--accent-ink)' : 'var(--muted)',
            boxShadow: view === key ? '0 1px 2px rgba(0,0,0,0.08)' : 'none', fontWeight: view === key ? 700 : 500
          }}
        >
          {label}
        </button>
      ))}
    </nav>
  );

  const content = (
    <>
      {inTabs && tabRow}
      {view === 'dashboard' && (
        <DashboardTab
          projects={projects}
          tasks={tasks}
          briefs={briefs}
          departments={departments}
          allStaff={allStaff}
          me={me}
          onSelectProject={onSelectProject}
          onRefetch={onRefetch}
          externalQuery={externalQuery}
        />
      )}
      {view === 'calendar' && (
        <CalendarTab projects={projects} tasks={tasks} briefs={briefs} departments={departments} allStaff={allStaff} me={me} onRefetch={onRefetch} />
      )}
      {view === 'ghichu' && <NotesTab me={me} />}
      {view === 'tongquan' && (
        <OverviewView
          me={me}
          projects={projects}
          tasks={tasks}
          briefs={briefs}
          departments={departments}
          allStaff={allStaff}
          onOpenProject={onSelectProject}
          onGo={(v) => go(v)}
        />
      )}
      {view === 'viectoi' && (
        <DashboardTab
          projects={projects}
          tasks={tasks}
          briefs={briefs}
          departments={departments}
          allStaff={allStaff}
          me={me}
          onSelectProject={onSelectProject}
          onRefetch={onRefetch}
          onlyStaffId={me.id}
          title="Việc của tôi"
          subtitle="Các đầu việc có tên bạn ở bất kỳ cột nhân sự nào (MKT, TTTH, Sáng tạo, Dựng). Bảng, màu và bộ lọc y hệt Dashboard."
        />
      )}
      {view === 'duan' && (
        <ProjectsBoard
          projects={projects}
          tasks={tasks}
          briefs={briefs}
          departments={departments}
          group={group}
          onGroupChange={setGroup}
          onSelectProject={onSelectProject}
        />
      )}
      {view === 'nhansu' && isAdminView && (
        <StaffView me={me} projects={projects} tasks={tasks} briefs={briefs} departments={departments} onSelectProject={onSelectProject} />
      )}
      {view === 'baocao' && isAdminView && (
        <div style={{ margin: isMobile ? '-16px -14px 0' : '-28px -28px 0' }}>
          <ReportShell embedded />
        </div>
      )}
      {view === 'taikhoan' && <AccountTab me={me} onRefetch={onRefetch} uiVersion={uiVersion} onChangeUi={onChangeUi} />}
    </>
  );

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg)', color: 'var(--text)' }}>
      {!isMobile && sidebar}

      {isMobile && drawerOpen && (
        <>
          <div onClick={() => setDrawerOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(20,20,19,0.45)', zIndex: 90 }} />
          <div style={{ position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 91, maxWidth: '86vw', display: 'flex' }}>{sidebar}</div>
        </>
      )}

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {isMobile && (
          <div
            style={{
              position: 'sticky', top: 0, zIndex: 40, background: 'var(--surface)', borderBottom: '1px solid var(--border)', height: 56,
              display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px'
            }}
          >
            <button onClick={() => setDrawerOpen(true)} aria-label="Mở menu" style={{ width: 40, height: 40, border: '1px solid var(--border)', borderRadius: 10, background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer', fontSize: 18 }}>
              ☰
            </button>
            <div style={{ flex: 1, fontSize: 15, fontWeight: 700 }}>ODE Project Manager</div>
            {unreadCount > 0 && (
              <button onClick={() => { setDrawerOpen(true); }} aria-label={`${unreadCount} thông báo mới`} style={{ border: 'none', background: 'rgba(198,60,60,0.12)', color: 'var(--st-red)', borderRadius: 999, padding: '4px 10px', fontSize: 12, fontWeight: 700 }}>
                {unreadCount} mới
              </button>
            )}
          </div>
        )}
        <main style={{ flex: 1, minWidth: 0, padding: isMobile ? '16px 14px 40px' : '28px 28px 60px', boxSizing: 'border-box', maxWidth: view === 'baocao' ? undefined : 1400, width: '100%' }}>
          {content}
        </main>
      </div>

      {createOpen && (
        <ProjectPipelineModal
          projects={projects}
          allStaff={allStaff}
          departments={departments}
          me={me}
          onClose={() => setCreateOpen(false)}
          onSaved={() => {
            setCreateOpen(false);
            onRefetch();
          }}
        />
      )}

      {children}
    </div>
  );
}
