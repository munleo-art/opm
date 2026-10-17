// Lọc công việc theo tuần ở Dashboard.
// Quy tắc (anh Minh chốt 17/10/2026): chọn 1 tuần → hiện việc của tuần đó + tuần kế tiếp.
// Tuần làm việc tính Thứ Hai → Thứ Bảy (việc có hạn Chủ Nhật tính vào tuần vừa kết thúc).
// Số tuần theo chuẩn ISO (tuần bắt đầu Thứ Hai).

export interface WeekOption {
  key: string; // YYYY-MM-DD của Thứ Hai
  monday: Date;
  saturday: Date;
  week: number;
  label: string;
  isCurrent: boolean;
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function mondayOf(d: Date): Date {
  const day = startOfDay(d);
  const dow = (day.getDay() + 6) % 7; // T2 = 0 … CN = 6
  day.setDate(day.getDate() - dow);
  return day;
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function isoWeek(d: Date): number {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (t.getUTCDay() + 6) % 7;
  t.setUTCDate(t.getUTCDate() - dayNum + 3); // Thứ Năm của tuần này
  const firstThursday = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
  return 1 + Math.round(((t.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
}

const pad = (n: number) => String(n).padStart(2, '0');
export const ddmm = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
const keyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function makeOption(monday: Date, today: Date): WeekOption {
  const saturday = addDays(monday, 5);
  const isCurrent = mondayOf(today).getTime() === monday.getTime();
  const week = isoWeek(monday);
  return {
    key: keyOf(monday),
    monday,
    saturday,
    week,
    isCurrent,
    label: `Tuần ${week}${monday.getFullYear() !== today.getFullYear() ? `/${monday.getFullYear()}` : ''} | Thứ Hai ${ddmm(monday)} - Thứ Bảy ${ddmm(saturday)}${isCurrent ? ' (tuần này)' : ''}`
  };
}

/** Danh sách tuần để chọn: 8 tuần trước → 12 tuần tới. */
export function weekOptions(today = new Date()): WeekOption[] {
  const cur = mondayOf(today);
  const list: WeekOption[] = [];
  for (let i = -8; i <= 12; i++) list.push(makeOption(addDays(cur, i * 7), today));
  return list;
}

export interface WeekWindow {
  first: WeekOption;
  second: WeekOption;
  start: Date; // Thứ Hai tuần chọn, 00:00
  end: Date; // hết Chủ Nhật tuần kế tiếp
  includesToday: boolean;
}

export function weekWindow(key: string, today = new Date()): WeekWindow | null {
  const [y, m, d] = key.split('-').map(Number);
  if (!y || !m || !d) return null;
  const monday = new Date(y, m - 1, d);
  const first = makeOption(monday, today);
  const second = makeOption(addDays(monday, 7), today);
  const start = monday;
  const end = addDays(monday, 14); // < end
  const t = startOfDay(today).getTime();
  return { first, second, start, end, includesToday: t >= start.getTime() && t < addDays(monday, 7).getTime() };
}

/** Việc thuộc khung 2 tuần nếu deadline gần nhất rơi vào khung. Việc chưa có deadline không hiện khi đang lọc tuần. */
export function inWeekWindow(deadline: string | null, w: WeekWindow): boolean {
  if (!deadline) return false;
  const d = startOfDay(new Date(deadline)).getTime();
  return d >= w.start.getTime() && d < w.end.getTime();
}

export interface DeadlineRow {
  nearestDeadline: string | null;
  completed: boolean;
}

export interface OverdueGroup<R> {
  title: string;
  rows: R[];
}

/**
 * Việc quá hạn chưa xong của các tuần trước — chỉ khi đang xem tuần hiện tại.
 * Hiển thị ở cuối danh sách, gom theo từng tuần, tuần gần nhất lên trước.
 */
export function overdueGroups<R extends DeadlineRow>(rows: R[], w: WeekWindow, today: Date = new Date()): OverdueGroup<R>[] {
  if (!w.includesToday) return [];
  const mondays: number[] = [];
  const byMonday: Record<string, R[]> = {};
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (r.completed || !r.nearestDeadline) continue;
    const d = startOfDay(new Date(r.nearestDeadline));
    if (d.getTime() >= w.start.getTime()) continue;
    const m = mondayOf(d).getTime();
    const k = String(m);
    if (!byMonday[k]) {
      byMonday[k] = [];
      mondays.push(m);
    }
    byMonday[k].push(r);
  }
  mondays.sort(function (a, b) {
    return b - a;
  });
  const prevMonday = addDays(w.start, -7).getTime();
  const out: OverdueGroup<R>[] = [];
  for (let i = 0; i < mondays.length; i++) {
    const m = mondays[i];
    const range = makeOption(new Date(m), today).label.replace(' (tuần này)', '');
    const title = m === prevMonday ? 'VIỆC QUÁ HẠN CỦA TUẦN TRƯỚC (' + range + ')' : 'VIỆC QUÁ HẠN CỦA TUẦN CŨ HƠN (' + range + ')';
    out.push({ title: title, rows: byMonday[String(m)] });
  }
  return out;
}
