'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { createClient } from '../../lib/supabase/client';
import type { Staff, Project, Task, Brief, Department, NotificationRow } from '../../lib/types';
import LogoutButton from './LogoutButton';
import NotificationBell from './NotificationBell';
import Avatar from './Avatar';
import ThemeControls from './ThemeControls';
import DashboardTab from './DashboardTab';
import { boardKeyOf } from '../../lib/board';
import ProjectDetailModal from './ProjectDetailModal';
import { canAddProject, visibleStaff } from '../../lib/permissions';
import { useTheme } from '../../lib/ThemeProvider';
import { readUiVersion, saveUiVersion, type UiVersion } from '../../lib/uiVersion';


// Các tab / cửa sổ ít dùng chỉ tải khi mở tới (giảm dung lượng tải lúc mở OPM)
const tabLoading = () => <div style={{ padding: 24, fontSize: 13.5, color: 'var(--muted)' }}>Đang tải...</div>;
const CalendarTab = dynamic(() => import('./CalendarTab'), { ssr: false, loading: tabLoading });
const NotesTab = dynamic(() => import('./NotesTab'), { ssr: false, loading: tabLoading });
const PhanCongTab = dynamic(() => import('./PhanCongTab'), { ssr: false, loading: tabLoading });
const VanPhongTab = dynamic(() => import('./VanPhongTab'), { ssr: false, loading: tabLoading });
const BoardTab = dynamic(() => import('./BoardTab'), { ssr: false, loading: tabLoading });
const ProjectsTab = dynamic(() => import('./ProjectsTab'), { ssr: false, loading: tabLoading });
const BriefTab = dynamic(() => import('./BriefTab'), { ssr: false, loading: tabLoading });
const AccountTab = dynamic(() => import('./AccountTab'), { ssr: false, loading: tabLoading });
const AddProjectModal = dynamic(() => import('./AddProjectModal'), { ssr: false, loading: tabLoading });
const NewShell = dynamic(() => import('./v2/NewShell'), { ssr: false, loading: tabLoading });

const TASK_SELECT =
  '*, assignee:staff!tasks_assignee_id_fkey(*, department:departments(id, name)), mkt_assignee:staff!tasks_mkt_assignee_id_fkey(*, department:departments(id, name)), st_assignee:staff!tasks_st_assignee_id_fkey(*, department:departments(id, name)), dung_assignee:staff!tasks_dung_assignee_id_fkey(*, department:departments(id, name)), ttth_assignee:staff!tasks_ttth_assignee_id_fkey(*, department:departments(id, name)), checklist_items(*)';
const NOTIF_LIMIT = 50;

export type TabKey = 'dashboard' | 'calendar' | 'ghichu' | 'phancong' | 'vanphong' | 'q6' | 'q9' | 'duan' | 'brief' | 'taikhoan';

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

  // Chỉ tải lại phần công việc (dự án, đầu việc, brief) sau mỗi thao tác — không kéo lại nhân sự/thông báo
  const fetchWork = useCallback(async () => {
    const [{ data: projectData }, { data: taskData }, { data: briefData }] = await Promise.all([
      supabase.from('projects').select('*').order('title'),
      supabase.from('tasks').select(TASK_SELECT).order('created_at'),
      supabase
        .from('briefs')
        .select('*, poster:staff!briefs_posted_by_fkey(*, department:departments(id, name))')
        .order('posted_at', { ascending: false })
    ]);
    if (projectData) setProjects(projectData as any);
    if (taskData) setTasks(taskData as any);
    if (briefData) setBriefs(briefData as any);
  }, [supabase]);

  // Thông báo: chỉ 50 cái gần nhất
  const fetchNotifs = useCallback(async () => {
    const { data } = await supabase
      .from('notification_recipients')
      .select('*, notification:notifications(*)')
      .order('notification_id', { ascending: false })
      .limit(NOTIF_LIMIT);
    if (data) setNotifications(data as any);
  }, [supabase]);

  // Sửa nhanh 1 đầu việc ngay trên màn hình (tick hoàn thành, tình trạng…) rồi mới ghi xuống DB
  const patchTask = useCallback((id: string, patch: Partial<Task> & Record<string, unknown>) => {
    setTasks((ts) => ts.map((t) => (t.id === id ? ({ ...t, ...patch } as Task) : t)));
  }, []);

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
      supabase.from('tasks').select(TASK_SELECT).order('created_at'),
      supabase
        .from('briefs')
        .select('*, poster:staff!briefs_posted_by_fkey(*, department:departments(id, name))')
        .order('posted_at', { ascending: false }),
      supabase
        .from('notification_recipients')
        .select('*, notification:notifications(*)')
        .order('notification_id', { ascending: false })
        .limit(NOTIF_LIMIT)
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

  // Tài khoản đã nghỉ việc: đăng xuất ngay (tài khoản đã bị khoá đăng nhập phía Supabase)
  useEffect(() => {
    if (!me || !(me as Staff & { resigned?: boolean }).resigned) return;
    supabase.auth.signOut().then(() => {
      if (typeof window !== 'undefined') window.location.href = '/login';
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me]);

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
          fetchNotifs();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [me, supabase, fetchNotifs]);

  if (loading) {
    return (
      <div style={{ padding: 40, fontSize: 13.5, color: 'var(--muted)' }}>Đang tải...</div>
    );
  }

  const selectedProject = projects.find((p) => p.id === selectedProjectId) ?? null;
  // Dự án Q6 / Q9 có bảng riêng: bấm vào dự án hoặc đầu việc của 2 dự án này → nhảy sang tab tương ứng
  const openProject = (id: string) => {
    const bk = boardKeyOf(projects.find((p) => p.id === id));
    if (bk) {
      setSelectedProjectId(null);
      setActiveTab(bk);
      if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
    } else setSelectedProjectId(id);
  };
  const boardProject = (k: 'q6' | 'q9') => projects.find((p) => boardKeyOf(p) === k) ?? null;

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
        onRefetch={fetchWork}
        onRefetchNotifs={fetchNotifs}
        onPatchTask={patchTask}
        onRefetchAll={fetchAll}
        onSelectProject={(id) => openProject(id)}
        uiVersion={uiVersion}
        onChangeUi={changeUi}
      >
        {selectedProject && (
          <ProjectDetailModal
            project={selectedProject}
            projects={projects}
            me={me}
            allStaff={allStaff}
            tasks={tasks.filter((t) => t.project_id === selectedProject.id)}
            onClose={() => setSelectedProjectId(null)}
            onRefetch={fetchWork}
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
                openProject(projectId);
              }}
              onRefetch={fetchNotifs}
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
              ['vanphong', 'Văn phòng'],
              ['q6', 'Q6'],
              ['q9', 'Q9']
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
            onSelectProject={(id) => openProject(id)}
            onRefetch={fetchWork}
          />
        )}
        {activeTab === 'ghichu' && <NotesTab me={me} />}
        {(activeTab === 'q6' || activeTab === 'q9') && (
          <BoardTab key={activeTab} boardKey={activeTab} project={boardProject(activeTab)} tasks={tasks} allStaff={allStaff} me={me} onRefetch={fetchWork} onPatchTask={patchTask} />
        )}
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
            onRefetch={fetchWork}
          />
        )}
        {activeTab === 'duan' && (
          <ProjectsTab
            projects={projects}
            me={me}
            onSelectProject={(id) => openProject(id)}
            onAddProject={() => setAddProjectOpen(true)}
          />
        )}
        {activeTab === 'brief' && <BriefTab projects={projects} briefs={briefs} onSelectProject={(id) => {
          openProject(id);
          setActiveTab('duan');
        }} />}
        {activeTab === 'taikhoan' && <AccountTab me={me} onRefetch={fetchAll} uiVersion={uiVersion} onChangeUi={changeUi} />}
      </div>

      {selectedProject && (
        <ProjectDetailModal
          project={selectedProject}
          projects={projects}
          me={me}
          allStaff={allStaff}
          tasks={tasks.filter((t) => t.project_id === selectedProject.id)}
          onClose={() => setSelectedProjectId(null)}
          onRefetch={fetchWork}
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
