export type Permission = 'Admin' | 'Cấp lãnh đạo' | 'Cấp chuyên viên' | 'Cấp nhân sự';

export interface Department {
  id: string;
  name: string;
}

export interface Staff {
  id: string;
  auth_user_id: string | null;
  employee_id: string;
  name: string;
  date_of_birth: string | null;
  department_id: string | null;
  position: string | null;
  phone: string | null;
  permission: Permission;
  avatar_url: string | null;
  department?: Department | null;
}

export interface Project {
  id: string;
  title: string;
  group_name: string;
  status_kind: string;
  status_label: string;
  created_by: string | null;
  created_at: string;
  mkt_lead_id: string | null;
  sang_tao_lead_id: string | null;
  dung_phim_lead_id: string | null;
  brief_link: string | null;
  kich_ban_link: string | null;
  tvc_link: string | null;
  deadline: string | null;
  ttth_lead_id: string | null;
}

export interface ChecklistItem {
  id: string;
  task_id: string;
  label: string;
  checked: boolean;
  item_group: string;
  sort_order: number;
}

export interface Task {
  id: string;
  project_id: string;
  assignee_id: string | null;
  task_type: string | null;
  task_name: string | null;
  deadline: string | null;
  brief_link: string | null;
  output_link: string | null;
  created_by: string | null;
  created_at: string;
  assignee?: Staff | null;
  checklist_items?: ChecklistItem[];
  mkt_assignee_id: string | null;
  st_assignee_id: string | null;
  dung_assignee_id: string | null;
  kich_ban_link: string | null;
  tvc_link: string | null;
  mkt_assignee?: Staff | null;
  st_assignee?: Staff | null;
  dung_assignee?: Staff | null;
  final_drive_link: string | null;
  final_youtube_link: string | null;
  completed: boolean;
  ttth_assignee_id: string | null;
  ttth_link: string | null;
  ttth_assignee?: Staff | null;
}

export interface Brief {
  id: string;
  project_id: string;
  title: string;
  link_url: string | null;
  deadline: string | null;
  posted_by: string | null;
  posted_at: string;
  poster?: Staff | null;
  final_drive_link: string | null;
  final_youtube_link: string | null;
  completed: boolean;
}

export interface NotificationRow {
  notification_id: string;
  staff_id: string;
  read_at: string | null;
  notification: {
    id: string;
    project_id: string | null;
    type: string;
    title: string;
    detail: string;
    created_at: string;
  };
}
