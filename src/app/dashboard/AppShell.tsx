'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '../../lib/supabase/client';
import type { Staff, Project, Task, Brief, Department, NotificationRow } from '../../lib/types';
import LogoutButton from './LogoutButton';
import NotificationBell from './NotificationBell';
import Avatar from './Avatar';
import AccountTab from './AccountTab';
import ThemeControls from './ThemeControls';
import DashboardTab from './DashboardTab';
import CalendarTab from './CalendarTab';
import NotesTab from './NotesTab';
import PhanCongTab from './PhanCongTab';
import VanPhongTab from './VanPhongTab';
import ProjectsTab from './ProjectsTab';
import BriefTab from './BriefTab';
import ProjectDetailModal from './ProjectDetailModal';
import AddProjectModal from './AddProjectModal';
import { canAddProject, visibleStaff } from '../../lib/permissions';
import { useTheme } from '../../lib/ThemeProvider';
import { readUiVersion, saveUiVersion, type UiVersion } from '../../lib/uiVersion';
import NewShell from './v2/NewShell';

export type TabKey = 'dashboard' | 'calendar' | 'ghichu' | 'phancong' | 'vanphong' | 'duan' | 'brief' | 'taikhoan';

export default function AppShell() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<Staff | null>(null);
  const [allStaff, setAllStaff] = useState<Staff[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);

  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [addProjectOpen, setAddProjectOpen] = useState(false);
  const { loadFromAccount } = useTheme();
  const themeLoadedFor = useRef<string | null>(null);
  // Giao diện cũ / mới — theo tài khoản, mặc định cũ.
  const [uiVersion, setUiVersion] = useState<UiVersion>('old');
  const uiLoadedFor = useRef<string | null>(null);

  const fetchAll = useCallback(async () => {
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return;

    const [
      { data: meData },
      { data: staffData },
      { data: deptData },
      { data: projectData },
      { data: taskData },
      { data: briefData },
      { data: notifData }
    ] = await Promise.all([
      supabase
        .from('staff')
        .select('*, department:departments(id, name)')
        .eq('auth_user_id', user.id)
        .single(),
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
        .order('posted_at', { ascending: false }),
      supabase
        .from('notification_recipients')
        .select('*, notification:notifications(*)')
        .order('notification_id', { ascending: false })
    ]);

    setMe((meData as any) ?? null);
    setAllStaff(visibleStaff((staffData as any) ?? [], (meData as any) ?? null));
    setDepartments((deptData as any) ?? []);
    setProjects((projectData as any) ?? []);
    setTasks((taskData as any) ?? []);
    setBriefs((briefData as any) ?? []);
    setNotifications((notifData as any) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Theme đi theo tài khoản: áp theme đã lưu 1 lần khi tải xong tài khoản (không ghi đè lại mỗi lần làm mới dữ liệu).
  useEffect(() => {
    if (!me || themeLoadedFor.current === me.id) return;
    themeLoadedFor.current = me.id;
    const m = me as Staff & { theme_key?: string | null; theme_mode?: string | null };
    loadFromAccount(me.id, m.theme_key, m.theme_mode);
  }, [me, loadFromAccount]);

  useEffect(() => {
    if (!me || uiLoadedFor.current === me.id) return;
    uiLoadedFor.current = me.id;
    setUiVersion(readUiVersion(me as Staff & { ui_version?: string | null }));
  }, [me]);

  const changeUi = useCallback(
    (v: UiVersion) => {
      setUiVersion(v);
      setActiveTab('dashboard');
      saveUiVersion(me?.id, v);
    },
    [me]
  );

  useEffect(() => {
    if (!me) return;
    const channel = supabase
      .channel('notif-' + me.id)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notification_recipients',
          filter: 'staff_id=eq.${me.id}'
        },
        () => {
          fetchAll();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [me, supabase, fetchAll]);

  if (loading) {
    return (
      <div style={{ padding: 40, fontSize: 13.5, color: 'var(--muted)' }}>Đang tải...</div>
    );
  }

  const selectedProject = projects.find((p) => p.id === selectedProjectId) ?? null;

  // ===== GIAO DIỆN MỚI (chỉ khi tài khoản bật) — giao diện cũ bên dưới giữ nguyên =====
  if (uiVersion === 'new' && me) {
    return (
      <NewShell
        me={me}
        allStaff={allStaff}
        departments={departments}
        projects={projects}
        tasks={tasks}
        briefs={briefs}
        notifications={notifications}
        onRefetch={fetchAll}
        onSelectProject={(id) => setSelectedProjectId(id)}
        uiVersion={uiVersion}
        onChangeUi={changeUi}
      >
        {selectedProject && (
          <ProjectDetailModal
            project={selectedProject}
            me={me}
            allStaff={allStaff}
            tasks={tasks.filter((t) => t.project_id === selectedProject.id)}
            onClose={() => setSelectedProjectId(null)}
            onRefetch={fetchAll}
          />
        )}
      </NewShell>
    );
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)'
        }}
      >
        <div
          className="m-pad"
          style={{
            maxWidth: 1100,
            margin: '0 auto',
            padding: '0 24px',
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10
          }}
        >
          <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              aria-hidden="true"
              style={{ width: 36, height: 36, borderRadius: 11, background: 'var(--accent)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-contrast)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="7.5" />
                <path d="M9 12l2 2 4-4" />
              </svg>
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.1, whiteSpace: 'nowrap' }}>ODE Project Manager</div>
              <div
                style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
              >
                {me?.name} · {me?.department?.name}
                <span className="m-hide"> · {me?.permission}</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <NotificationBell
              notifications={notifications}
              onOpenProject={(projectId) => {
                setSelectedProjectId(projectId);
              }}
              onRefetch={fetchAll}
            />
            {/* Trên điện thoại: chỉnh giao diện + Đăng xuất nằm trong trang Tài khoản (bấm avatar) cho header gọn */}
            <span className="m-hide" style={{ display: 'contents' }}>
              <ThemeControls uiVersion={uiVersion} onChangeUi={changeUi} />
            </span>
            <button
              onClick={() => setActiveTab('taikhoan')}
              aria-label="Tài khoản"
              style={{
                border: activeTab === 'taikhoan' ? '2px solid var(--accent)' : '1px solid var(--border)',
                borderRadius: '50%',
                padding: 0,
                background: 'transparent',
                cursor: 'pointer',
                lineHeight: 0
              }}
            >
              <Avatar me={me} size={38} />
            </button>
            <span className="m-hide" style={{ display: 'contents' }}>
              <LogoutButton />
            </span>
          </div>
        </div>
        <div className="m-pad" style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 14px' }}>
        <nav
          aria-label="Điều hướng chính"
          className="ode-tabs"
          style={{ display: 'inline-flex', gap: 4, background: 'var(--chip)', padding: 4, borderRadius: 12 }}
        >
          {(
            [
              ['dashboard', 'Dashboard'],
              ['calendar', 'Lịch'],
              ['ghichu', 'Ghi chú'],
              ['phancong', 'Phân công'],
              ['vanphong', 'Văn phòng']
              // Tạm ẩn tab DỰ ÁN và BRIEF theo yêu cầu — logic/route vẫn giữ nguyên bên dưới, chỉ ẩn nút điều hướng.
            ] as [TabKey, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              aria-current={activeTab === key ? 'page' : undefined}
              style={{
                height: 36,
                padding: '0 18px',
                borderRadius: 9,
                border: 'none',
                background: activeTab === key ? 'var(--surface)' : 'transparent',
                color: activeTab === key ? 'var(--accent-ink)' : 'var(--muted)',
                boxShadow: activeTab === key ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                fontFamily: 'inherit',
                fontSize: 14,
                fontWeight: activeTab === key ? 700 : 500,
                cursor: 'pointer'
              }}
            >
              {label}
            </button>
          ))}
        </nav>
        </div>
      </div>

      <div className="ode-main" style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px' }}>
        <style>{`@media (max-width: 640px) { .ode-main { padding: 16px 14px 8px !important; } }`}</style>
        {activeTab === 'dashboard' && (
          <DashboardTab
            projects={projects}
            tasks={tasks}
            briefs={briefs}
            departments={departments}
            allStaff={allStaff}
            me={me}
            onSelectProject={(id) => setSelectedProjectId(id)}
            onRefetch={fetchAll}
          />
        )}
        {activeTab === 'ghichu' && <NotesTab me={me} />}
        {activeTab === 'vanphong' && (
          <VanPhongTab projects={projects} tasks={tasks} briefs={briefs} departments={departments} allStaff={allStaff} />
        )}
        {activeTab === 'phancong' && (
          <PhanCongTab projects={projects} tasks={tasks} briefs={briefs} departments={departments} allStaff={allStaff} />
        )}
        {activeTab === 'calendar' && (
          <CalendarTab
            projects={projects}
            tasks={tasks}
            briefs={briefs}
            departments={departments}
            allStaff={allStaff}
            me={me}
            onRefetch={fetchAll}
          />
        )}
        {activeTab === 'duan' && (
          <ProjectsTab
            projects={projects}
            me={me}
            onSelectProject={(id) => setSelectedProjectId(id)}
            onAddProject={() => setAddProjectOpen(true)}
          />
        )}
        {activeTab === 'brief' && <BriefTab projects={projects} briefs={briefs} onSelectProject={(id) => {
          setSelectedProjectId(id);
          setActiveTab('duan');
        }} />}
        {activeTab === 'taikhoan' && <AccountTab me={me} onRefetch={fetchAll} uiVersion={uiVersion} onChangeUi={changeUi} />}
      </div>

      {selectedProject && (
        <ProjectDetailModal
          project={selectedProject}
          me={me}
          allStaff={allStaff}
          tasks={tasks.filter((t) => t.project_id === selectedProject.id)}
          onClose={() => setSelectedProjectId(null)}
          onRefetch={fetchAll}
        />
      )}

      {addProjectOpen && me && canAddProject(me) && (
        <AddProjectModal
          me={me}
          onClose={() => setAddProjectOpen(false)}
          onCreated={() => {
            setAddProjectOpen(false);
            fetchAll();
          }}
        />
      )}
    </div>
  );
}
