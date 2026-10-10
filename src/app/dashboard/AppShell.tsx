'use client';

import { useCallback, useEffect, useState } from 'react';
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
import ProjectsTab from './ProjectsTab';
import BriefTab from './BriefTab';
import ProjectDetailModal from './ProjectDetailModal';
import AddProjectModal from './AddProjectModal';
import { canAddProject, visibleStaff } from '../../lib/permissions';

export type TabKey = 'dashboard' | 'calendar' | 'ghichu' | 'duan' | 'brief' | 'taikhoan';

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
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: 1, whiteSpace: 'nowrap' }}>
              ODE PROJECT MANAGER
            </div>
            <div
              style={{ fontSize: 11.5, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
            >
              {me?.name} · {me?.department?.name}
              <span className="m-hide"> · {me?.permission}</span>
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
              <ThemeControls />
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
        <div
          className="m-pad"
          style={{
            maxWidth: 1100,
            margin: '0 auto',
            padding: '0 24px 14px',
            display: 'flex',
            gap: 8
          }}
        >
          {(
            [
              ['dashboard', 'DASHBOARD'],
              ['calendar', 'LỊCH'],
              ['ghichu', 'GHI CHÚ']
              // Tạm ẩn tab DỰ ÁN và BRIEF theo yêu cầu — logic/route vẫn giữ nguyên bên dưới, chỉ ẩn nút điều hướng.
            ] as [TabKey, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                height: 34,
                padding: '0 16px',
                borderRadius: 18,
                border: '1px solid var(--border)',
                background: activeTab === key ? 'var(--accent)' : 'transparent',
                color: activeTab === key ? 'var(--accent-contrast)' : 'var(--text)',
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: 0.4,
                cursor: 'pointer'
              }}
            >
              {label}
            </button>
          ))}
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
        {activeTab === 'taikhoan' && <AccountTab me={me} onRefetch={fetchAll} />}
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
