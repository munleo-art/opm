// Các công cụ CHỈ ĐỌC cho Claude/ChatGPT. Không có công cụ nào ghi dữ liệu.
type Checklist = { label: string; group: string | null; checked: boolean; deadline: string | null };
type Task = {
  id: string; project: string | null; task_type: string | null; task_name: string | null; deadline: string | null; completed: boolean;
  assignee: string | null; mkt_assignee: string | null; sang_tao_assignee: string | null; dung_phim_assignee: string | null; ttth_assignee: string | null;
  brief_link: string | null; kich_ban_link: string | null; tvc_link: string | null; final_drive_link: string | null; final_youtube_link: string | null;
  checklist: Checklist[];
};
type Project = {
  id: string; title: string; group: string | null; status: string | null; deadline: string | null;
  brief_link: string | null; kich_ban_link: string | null; tvc_link: string | null;
  mkt_lead: string | null; sang_tao_lead: string | null; dung_phim_lead: string | null; ttth_lead: string | null;
};
type Staff = { id: string; name: string; employee_id: string | null; date_of_birth: string | null; department: string | null; position: string | null; phone: string | null };
type Brief = { id: string; project: string | null; title: string | null; link: string | null; deadline: string | null; posted_by: string | null; posted_at: string | null; completed: boolean };
export type Snapshot = { generated_at: string; staff: Staff[]; projects: Project[]; tasks: Task[]; briefs: Brief[]; departments: { name: string }[]; requested_by?: string };

const TZ = 'Asia/Ho_Chi_Minh';
const RO = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };

export const TOOLS = [
  {
    name: 'viec_chua_hoan_thanh',
    title: 'Việc chưa hoàn thành',
    description:
      'Liệt kê các công việc CHƯA hoàn thành, nhóm theo dự án, kèm hạn chót, người phụ trách và các mục checklist còn thiếu. Dùng cho câu hỏi kiểu "tổng hợp việc chưa làm hôm nay theo từng dự án", "việc nào quá hạn". Có thể lọc theo dự án, người phụ trách, hạn đến ngày.',
    inputSchema: {
      type: 'object',
      properties: {
        du_an: { type: 'string', description: 'Một phần tên dự án (không bắt buộc)' },
        nguoi_phu_trach: { type: 'string', description: 'Một phần tên nhân sự (không bắt buộc)' },
        han_den_ngay: { type: 'string', description: 'Chỉ lấy việc có hạn đến hết ngày này, định dạng YYYY-MM-DD (không bắt buộc). Dùng ngày hôm nay để lấy việc cần xong hôm nay + quá hạn.' },
        chi_qua_han: { type: 'boolean', description: 'true = chỉ lấy việc đã quá hạn' }
      }
    },
    annotations: { title: 'Việc chưa hoàn thành', ...RO }
  },
  {
    name: 'danh_sach_du_an',
    title: 'Danh sách dự án',
    description: 'Liệt kê dự án kèm nhóm (khu vực/Corporation), trạng thái, hạn chót, các lãnh đạo phụ trách và số việc đang làm / đã xong.',
    inputSchema: {
      type: 'object',
      properties: {
        tu_khoa: { type: 'string', description: 'Lọc theo một phần tên dự án hoặc tên nhóm (không bắt buộc)' }
      }
    },
    annotations: { title: 'Danh sách dự án', ...RO }
  },
  {
    name: 'chi_tiet_du_an',
    title: 'Chi tiết dự án',
    description: 'Xem toàn bộ thông tin một dự án: người phụ trách, các link, mọi công việc (kèm checklist) và brief.',
    inputSchema: {
      type: 'object',
      properties: { du_an: { type: 'string', description: 'Tên (hoặc một phần tên) hoặc id dự án' } },
      required: ['du_an']
    },
    annotations: { title: 'Chi tiết dự án', ...RO }
  },
  {
    name: 'viec_cua_nhan_su',
    title: 'Việc của một nhân sự',
    description: 'Liệt kê các công việc mà một nhân sự đang được giao (ở bất kỳ vai trò nào), chia ra chưa xong / đã xong.',
    inputSchema: {
      type: 'object',
      properties: {
        ten: { type: 'string', description: 'Tên (hoặc một phần tên) nhân sự' },
        bao_gom_da_xong: { type: 'boolean', description: 'true = kèm cả việc đã hoàn thành' }
      },
      required: ['ten']
    },
    annotations: { title: 'Việc của một nhân sự', ...RO }
  },
  {
    name: 'danh_sach_nhan_su',
    title: 'Danh sách nhân sự',
    description: 'Danh sách nhân sự đang hoạt động: tên, mã NV, ngày sinh, phòng ban, chức vụ, SĐT. Có thể lọc theo phòng ban hoặc tên.',
    inputSchema: {
      type: 'object',
      properties: {
        phong_ban: { type: 'string', description: 'Một phần tên phòng ban (không bắt buộc)' },
        tu_khoa: { type: 'string', description: 'Một phần tên nhân sự (không bắt buộc)' }
      }
    },
    annotations: { title: 'Danh sách nhân sự', ...RO }
  },
  {
    name: 'search',
    title: 'Tìm kiếm',
    description: 'Tìm dự án, công việc, brief hoặc nhân sự theo từ khoá. Trả về danh sách id để dùng với công cụ fetch.',
    inputSchema: { type: 'object', properties: { query: { type: 'string', description: 'Từ khoá tìm kiếm' } }, required: ['query'] },
    annotations: { title: 'Tìm kiếm', ...RO }
  },
  {
    name: 'fetch',
    title: 'Xem chi tiết theo id',
    description: 'Lấy nội dung đầy đủ của một dự án / công việc / brief / nhân sự theo id nhận được từ công cụ search.',
    inputSchema: { type: 'object', properties: { id: { type: 'string', description: 'id dạng project:..., task:..., brief:..., staff:...' } }, required: ['id'] },
    annotations: { title: 'Xem chi tiết theo id', ...RO }
  }
];

export function norm(s: string | null | undefined) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd').toLowerCase().trim();
}
const has = (hay: string | null | undefined, needle: string) => norm(hay).includes(norm(needle));

function fmt(d: string | null) {
  if (!d) return null;
  const date = new Date(d.length === 10 ? `${d}T00:00:00+07:00` : d);
  if (isNaN(date.getTime())) return d;
  const opts: Intl.DateTimeFormatOptions = d.length === 10
    ? { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' }
    : { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false };
  return new Intl.DateTimeFormat('vi-VN', opts).format(date);
}

function todayVN() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

function dayOf(d: string | null) {
  if (!d) return null;
  if (d.length === 10) return d;
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(d));
}

function people(t: Task) {
  const p: Record<string, string> = {};
  if (t.assignee) p['phu_trach'] = t.assignee;
  if (t.mkt_assignee) p['marketing'] = t.mkt_assignee;
  if (t.sang_tao_assignee) p['sang_tao'] = t.sang_tao_assignee;
  if (t.dung_phim_assignee) p['dung_phim'] = t.dung_phim_assignee;
  if (t.ttth_assignee) p['ttth'] = t.ttth_assignee;
  return p;
}

function involves(t: Task, name: string) {
  return [t.assignee, t.mkt_assignee, t.sang_tao_assignee, t.dung_phim_assignee, t.ttth_assignee].some((x) => has(x, name));
}

function taskView(t: Task, full = false) {
  const today = todayVN();
  const day = dayOf(t.deadline);
  const v: Record<string, unknown> = {
    id: `task:${t.id}`,
    du_an: t.project,
    loai: t.task_type,
    ten_viec: t.task_name,
    han_chot: fmt(t.deadline),
    trang_thai: t.completed ? 'đã hoàn thành' : day && day < today ? 'QUÁ HẠN' : day === today ? 'hạn hôm nay' : 'đang làm',
    nguoi: people(t)
  };
  const open = (t.checklist || []).filter((c) => !c.checked);
  if (full) {
    v.checklist = (t.checklist || []).map((c) => ({ muc: c.label, nhom: c.group, xong: c.checked, han: fmt(c.deadline) }));
    const links: Record<string, string> = {};
    for (const k of ['brief_link', 'kich_ban_link', 'tvc_link', 'final_drive_link', 'final_youtube_link'] as const) if (t[k]) links[k] = t[k] as string;
    v.links = links;
  } else if (!t.completed) {
    v.checklist_con_thieu = open.map((c) => (c.deadline ? `${c.label} (hạn ${fmt(c.deadline)})` : c.label));
    v.tien_do_checklist = `${(t.checklist || []).length - open.length}/${(t.checklist || []).length}`;
  }
  return v;
}

function findProject(s: Snapshot, q: string) {
  const id = q.replace(/^project:/, '');
  return s.projects.find((p) => p.id === id) || s.projects.find((p) => norm(p.title) === norm(q)) || s.projects.find((p) => has(p.title, q));
}

function projectView(s: Snapshot, p: Project, full = false) {
  const tasks = s.tasks.filter((t) => t.project === p.title);
  const v: Record<string, unknown> = {
    id: `project:${p.id}`,
    ten: p.title,
    nhom: p.group,
    trang_thai: p.status,
    han_chot: fmt(p.deadline),
    lanh_dao: { marketing: p.mkt_lead, sang_tao: p.sang_tao_lead, dung_phim: p.dung_phim_lead, ttth: p.ttth_lead },
    so_viec_dang_lam: tasks.filter((t) => !t.completed).length,
    so_viec_da_xong: tasks.filter((t) => t.completed).length
  };
  if (full) {
    v.links = { brief: p.brief_link, kich_ban: p.kich_ban_link, tvc: p.tvc_link };
    v.cong_viec = tasks.map((t) => taskView(t, true));
    v.brief = s.briefs.filter((b) => b.project === p.title).map(briefView);
  }
  return v;
}

function briefView(b: Brief) {
  return { id: `brief:${b.id}`, du_an: b.project, tieu_de: b.title, link: b.link, han_chot: fmt(b.deadline), nguoi_dang: b.posted_by, ngay_dang: fmt(b.posted_at), da_xong: b.completed };
}

function staffView(st: Staff) {
  return { id: `staff:${st.id}`, ten: st.name, ma_nv: st.employee_id, ngay_sinh: fmt(st.date_of_birth), phong_ban: st.department, chuc_vu: st.position, sdt: st.phone };
}

function sortByDeadline(a: Task, b: Task) {
  return (a.deadline || '9999').localeCompare(b.deadline || '9999');
}

export function runTool(name: string, args: Record<string, any>, s: Snapshot, origin: string): unknown {
  const meta = { hom_nay: fmt(todayVN()), mui_gio: 'Giờ Việt Nam (UTC+7)', du_lieu_luc: fmt(s.generated_at) };
  args = args || {};

  switch (name) {
    case 'viec_chua_hoan_thanh': {
      const today = todayVN();
      let tasks = s.tasks.filter((t) => !t.completed);
      if (args.du_an) tasks = tasks.filter((t) => has(t.project, args.du_an));
      if (args.nguoi_phu_trach) tasks = tasks.filter((t) => involves(t, args.nguoi_phu_trach));
      if (args.han_den_ngay) tasks = tasks.filter((t) => { const d = dayOf(t.deadline); return d !== null && d <= args.han_den_ngay; });
      if (args.chi_qua_han) tasks = tasks.filter((t) => { const d = dayOf(t.deadline); return d !== null && d < today; });
      const groups: Record<string, unknown[]> = {};
      for (const t of tasks.sort(sortByDeadline)) (groups[t.project || '(không rõ dự án)'] ||= []).push(taskView(t));
      return { ...meta, tong_so_viec: tasks.length, theo_du_an: Object.entries(groups).map(([du_an, viec]) => ({ du_an, so_viec: viec.length, viec })) };
    }
    case 'danh_sach_du_an': {
      let ps = s.projects;
      if (args.tu_khoa) ps = ps.filter((p) => has(p.title, args.tu_khoa) || has(p.group, args.tu_khoa));
      return { ...meta, tong_so: ps.length, du_an: ps.map((p) => projectView(s, p)) };
    }
    case 'chi_tiet_du_an': {
      const p = findProject(s, String(args.du_an || ''));
      if (!p) return { ...meta, loi: `Không tìm thấy dự án "${args.du_an}". Hãy dùng danh_sach_du_an để xem tên chính xác.` };
      return { ...meta, ...projectView(s, p, true) };
    }
    case 'viec_cua_nhan_su': {
      const ten = String(args.ten || '');
      const matched = s.staff.filter((st) => has(st.name, ten)).map((st) => st.name);
      const tasks = s.tasks.filter((t) => involves(t, ten)).sort(sortByDeadline);
      return {
        ...meta,
        nhan_su_khop: matched,
        chua_xong: tasks.filter((t) => !t.completed).map((t) => taskView(t)),
        ...(args.bao_gom_da_xong ? { da_xong: tasks.filter((t) => t.completed).map((t) => taskView(t)) } : { so_viec_da_xong: tasks.filter((t) => t.completed).length })
      };
    }
    case 'danh_sach_nhan_su': {
      let st = s.staff;
      if (args.phong_ban) st = st.filter((x) => has(x.department, args.phong_ban));
      if (args.tu_khoa) st = st.filter((x) => has(x.name, args.tu_khoa));
      return { ...meta, tong_so: st.length, nhan_su: st.map(staffView) };
    }
    case 'search': {
      const q = String(args.query || '');
      const url = (id: string) => `${origin}/dashboard#${id}`;
      const results = [
        ...s.projects.filter((p) => has(p.title, q) || has(p.group, q)).map((p) => ({ id: `project:${p.id}`, title: `Dự án: ${p.title}`, url: url(`project:${p.id}`) })),
        ...s.tasks.filter((t) => has(t.task_name, q) || has(t.project, q) || involves(t, q)).map((t) => ({ id: `task:${t.id}`, title: `Việc: ${t.task_name || t.task_type || ''} — ${t.project || ''}`, url: url(`task:${t.id}`) })),
        ...s.briefs.filter((b) => has(b.title, q) || has(b.project, q)).map((b) => ({ id: `brief:${b.id}`, title: `Brief: ${b.title || ''} — ${b.project || ''}`, url: url(`brief:${b.id}`) })),
        ...s.staff.filter((x) => has(x.name, q) || has(x.department, q)).map((x) => ({ id: `staff:${x.id}`, title: `Nhân sự: ${x.name} (${x.department || ''})`, url: url(`staff:${x.id}`) }))
      ].slice(0, 50);
      return { results };
    }
    case 'fetch': {
      const id = String(args.id || '');
      const [kind, raw] = id.includes(':') ? [id.split(':')[0], id.slice(id.indexOf(':') + 1)] : ['', id];
      let data: unknown = null;
      let title = id;
      if (kind === 'project' || !kind) { const p = s.projects.find((x) => x.id === raw); if (p) { data = projectView(s, p, true); title = p.title; } }
      if (!data && (kind === 'task' || !kind)) { const t = s.tasks.find((x) => x.id === raw); if (t) { data = taskView(t, true); title = t.task_name || t.task_type || id; } }
      if (!data && (kind === 'brief' || !kind)) { const b = s.briefs.find((x) => x.id === raw); if (b) { data = briefView(b); title = b.title || id; } }
      if (!data && (kind === 'staff' || !kind)) { const x = s.staff.find((y) => y.id === raw); if (x) { data = staffView(x); title = x.name; } }
      if (!data) return { id, title: 'Không tìm thấy', text: `Không có mục nào với id ${id}`, url: `${origin}/dashboard` };
      return { id, title, text: JSON.stringify(data), url: `${origin}/dashboard#${id}`, metadata: meta };
    }
    default:
      throw new Error(`unknown_tool:${name}`);
  }
}
