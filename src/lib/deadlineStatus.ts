// Quy tắc màu deadline — GIỐNG HỆT Dashboard (DashboardTab.rowStyle):
//  - Đã hoàn thành            → xanh lục
//  - Còn ≤1 ngày / quá hạn    → đỏ
//  - Còn 2–3 ngày             → cam
//  - Còn >3 ngày / chưa có hạn → xanh dương
export type DeadlineKey = 'red' | 'orange' | 'blue' | 'green';

export function daysUntil(dateStr: string): number {
  const d = new Date(dateStr);
  const today = new Date();
  const dOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const tOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((dOnly.getTime() - tOnly.getTime()) / 86400000);
}

export function deadlineKey(nearestDeadline: string | null, completed: boolean): DeadlineKey {
  if (completed) return 'green';
  if (!nearestDeadline) return 'blue';
  const d = daysUntil(nearestDeadline);
  if (d <= 1) return 'red';
  if (d <= 3) return 'orange';
  return 'blue';
}

export const DEADLINE_VAR: Record<DeadlineKey, string> = {
  red: 'var(--st-red)',
  orange: 'var(--st-orange)',
  blue: 'var(--st-blue)',
  green: 'var(--st-green)'
};

// Nền nhạt cùng tông, dùng cho thẻ/dòng tô cả khối.
export const DEADLINE_TINT: Record<DeadlineKey, string> = {
  red: 'rgba(198,60,60,0.10)',
  orange: 'rgba(176,101,10,0.11)',
  blue: 'rgba(74,111,168,0.10)',
  green: 'rgba(46,125,50,0.10)'
};

export function deadlineText(nearestDeadline: string | null, completed: boolean): string {
  if (completed) return '✓ Đã xong';
  if (!nearestDeadline) return 'Chưa có hạn';
  const d = daysUntil(nearestDeadline);
  if (d < 0) return `Quá hạn ${-d} ngày`;
  if (d === 0) return 'Hạn hôm nay';
  if (d === 1) return 'Hạn ngày mai';
  if (d <= 3) return `Còn ${d} ngày`;
  const dt = new Date(nearestDeadline);
  return `Hạn ${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}`;
}
