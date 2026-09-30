import type { Staff, Task } from './types';

export function isMarketingDept(me: Staff | null): boolean {
  return me?.department?.name === 'Ban Marketing';
}

export function isLeadOrSpecialist(me: Staff | null): boolean {
  return me?.permission === 'Cấp lãnh đạo' || me?.permission === 'Cấp chuyên viên';
}

export function canAddProject(me: Staff | null): boolean {
  if (!me) return false;
  return (
    me.permission === 'Admin' ||
    me.permission === 'Cấp lãnh đạo' ||
    me.permission === 'Cấp chuyên viên'
  );
}

export function canManageAnyTask(me: Staff | null): boolean {
  if (!me) return false;
  if (me.permission === 'Admin') return true;
  return isLeadOrSpecialist(me) && !isMarketingDept(me);
}

export function canManageBriefs(me: Staff | null): boolean {
  if (!me) return false;
  return me.permission === 'Admin' || isMarketingDept(me);
}

export function canEditTaskChecklist(me: Staff | null, task: Task | null): boolean {
  if (!me || !task) return false;
  if (canManageAnyTask(me)) return true;
  return (
    task.assignee_id === me.id ||
    task.mkt_assignee_id === me.id ||
    task.st_assignee_id === me.id ||
    task.dung_assignee_id === me.id ||
    task.ttth_assignee_id === me.id
  );
}

export function canAssignKichBan(me: Staff | null): boolean {
  if (!me) return false;
  if (me.permission === 'Admin') return true;
  if (!isLeadOrSpecialist(me)) return false;
  const dept = me.department?.name;
  return dept === 'Ban Sáng tạo' || dept === 'Ban Lãnh đạo';
}

export function canAssignDungPhim(me: Staff | null): boolean {
  if (!me) return false;
  if (me.permission === 'Admin') return true;
  if (!isLeadOrSpecialist(me)) return false;
  const dept = me.department?.name;
  return dept === 'Team Dựng phim' || dept === 'Ban Lãnh đạo';
}

// Trang quản trị nhân sự: chỉ Admin và Cấp lãnh đạo được xem (Cấp chuyên viên không được).
export function canSeeAdmin(me: Staff | null): boolean {
  if (!me) return false;
  return me.permission === 'Admin' || me.permission === 'Cấp lãnh đạo';
}

// Admin và Cấp lãnh đạo thuộc Ban Lãnh đạo xem được nhân sự của TẤT CẢ các team.
// Cấp lãnh đạo của một team cụ thể (Giám đốc/Leader team) chỉ xem được nhân sự team đó.
export function canSeeAllStaffAdmin(me: Staff | null): boolean {
  if (!me) return false;
  if (me.permission === 'Admin') return true;
  return me.permission === 'Cấp lãnh đạo' && me.department?.name === 'Ban Lãnh đạo';
}

// Tài khoản Demo (dùng để test) chỉ hiển thị với chính tài khoản Admin.
// Mọi tài khoản khác (kể cả Cấp lãnh đạo) sẽ không thấy các tài khoản Demo trong danh sách nhân sự.
export function isDemoStaff(s: { name?: string | null } | null | undefined): boolean {
  const n: string | null | undefined = s ? s.name : undefined;
  if (!n) return false;
  return n.trim().toLowerCase().indexOf('demo') === 0;
}

export function visibleStaff<T extends { name?: string | null }>(list: T[], me: Staff | null): T[] {
  if (me && me.permission === 'Admin') return list;
  return list.filter((s: T) => !isDemoStaff(s));
}
