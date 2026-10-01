import type { Project, Task, Brief, Department, Staff } from './types';
import { computeTaskProgress } from './checklist';

export interface WorkRow {
  key: string;
  project: Project;
  brief: Brief | null;
  primaryTask: Task | null;
  // Task/brief thực sự đứng sau nút "HOÀN THÀNH CÔNG VIỆC" + 2 link FINAL — dùng để đọc/ghi
  // completed, final_drive_link, final_youtube_link. Với dòng có brief thì đây luôn là null
  // (dùng brief thay thế); với dòng không có brief thì đây là chính task đứng sau dòng đó.
  backingTask: Task | null;
  mktStaff: Staff | null;
  // Task đứng sau nút Link brief + tên nhân sự của mục TTTH trong WorkItemDetailModal — luôn là
  // 1 task cụ thể (không có bảng riêng như Brief của Marketing), null nếu đầu việc này không có
  // task nào mang ttth_assignee_id.
  ttthTask: Task | null;
  ttthStaff: Staff | null;
  headline: string;
  stTasks: Task[];
  dungTasks: Task[];
  progress: number;
  nearestDeadline: string | null;
  completed: boolean;
}

function briefMatchesTask(task: Task, brief: Brief): boolean {
  if (!task.brief_link) return false;
  if (brief.link_url) return task.brief_link === brief.link_url;
  return task.brief_link === brief.title;
}

export function buildRows(projects: Project[], tasks: Task[], briefs: Brief[], departments: Department[]): WorkRow[] {
  const sangTaoId = departments.find((d) => d.name === 'Ban Sáng tạo')?.id;
  const dungPhimId = departments.find((d) => d.name === 'Team Dựng phim')?.id;

  const rows: WorkRow[] = [];

  for (const p of projects) {
    const pBriefs = briefs.filter((b) => b.project_id === p.id);
    const pTasks = tasks.filter((t) => t.project_id === p.id);
    if (pBriefs.length === 0 && pTasks.length === 0) continue;

    const usedTaskIds = new Set<string>();

    for (const b of pBriefs) {
      const matched = pTasks.filter((t) => briefMatchesTask(t, b));
      matched.forEach((t) => usedTaskIds.add(t.id));

      const stTasks = matched.filter((t) => t.assignee?.department_id === sangTaoId || !!t.st_assignee_id);
      const dungTasks = matched.filter((t) => t.assignee?.department_id === dungPhimId || !!t.dung_assignee_id);
      const relevantTasks = [...stTasks, ...dungTasks];

      const progress =
        relevantTasks.length > 0
          ? Math.round(
              relevantTasks.reduce((sum, t) => sum + computeTaskProgress(t.checklist_items ?? []), 0) /
                relevantTasks.length
            )
          : 0;

      const deadlineTimes: number[] = [];
      if (b.deadline) deadlineTimes.push(new Date(b.deadline).getTime());
      relevantTasks.forEach((t) => {
        if (t.deadline) deadlineTimes.push(new Date(t.deadline).getTime());
      });
      deadlineTimes.sort((a, c) => a - c);

      const ttthTask = matched.find((t) => t.ttth_assignee_id) ?? null;

      rows.push({
        key: `brief-${b.id}`,
        project: p,
        brief: b,
        primaryTask: null,
        backingTask: null,
        mktStaff: b.poster ?? null,
        ttthTask,
        ttthStaff: ttthTask?.ttth_assignee ?? null,
        headline: b.title,
        stTasks,
        dungTasks,
        progress,
        nearestDeadline: deadlineTimes.length ? new Date(deadlineTimes[0]).toISOString() : null,
        completed: b.completed
      });
    }

    const orphanTasks = pTasks.filter((t) => !usedTaskIds.has(t.id));
    for (const t of orphanTasks) {
      // Đầu việc tạo từ danh sách công việc của dự án mang cả 3 vai trò (MKT/ST/Dựng)
      // trên cùng 1 dòng, xác định qua mkt_assignee_id/st_assignee_id/dung_assignee_id.
      const hasRoleAssignees = !!(t.mkt_assignee_id || t.st_assignee_id || t.dung_assignee_id || t.ttth_assignee_id);
      if (hasRoleAssignees) {
        rows.push({
          key: `task-${t.id}`,
          project: p,
          brief: null,
          primaryTask: t,
          backingTask: t,
          mktStaff: t.mkt_assignee ?? null,
          ttthTask: t,
          ttthStaff: t.ttth_assignee ?? null,
          headline: t.task_name || t.task_type || '',
          stTasks: t.st_assignee_id ? [t] : [],
          dungTasks: t.dung_assignee_id ? [t] : [],
          progress: computeTaskProgress(t.checklist_items ?? []),
          nearestDeadline: t.deadline ?? null,
          completed: t.completed
        });
      } else {
        const isST = t.assignee?.department_id === sangTaoId;
        const isDung = t.assignee?.department_id === dungPhimId;
        rows.push({
          key: `task-${t.id}`,
          project: p,
          brief: null,
          primaryTask: null,
          backingTask: t,
          mktStaff: null,
          ttthTask: null,
          ttthStaff: null,
          headline: t.task_name || t.task_type || '',
          stTasks: isST ? [t] : [],
          dungTasks: isDung ? [t] : [],
          progress: computeTaskProgress(t.checklist_items ?? []),
          nearestDeadline: t.deadline ?? null,
          completed: t.completed
        });
      }
    }
  }

  return rows;
}
