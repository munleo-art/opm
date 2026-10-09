// Trang cho nhân viên đăng nhập (Mã NV + mật khẩu) và cho phép Claude/ChatGPT ĐỌC dữ liệu.
import { anonClient } from '../../../lib/mcp/common';
import { employeeIdToEmail } from '../../../lib/employeeEmail';

export const dynamic = 'force-dynamic';

type AuthParams = {
  client_id: string;
  redirect_uri: string;
  state: string;
  code_challenge: string;
  code_challenge_method: string;
  response_type: string;
};

const FIELDS: (keyof AuthParams)[] = ['client_id', 'redirect_uri', 'state', 'code_challenge', 'code_challenge_method', 'response_type'];

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

function html(body: string, status = 200) {
  const page = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Kết nối AI — ODE Project Manager</title>
<style>
:root{--bg:#FFF8F0;--surface:#fff;--border:#EADFD3;--text:#2B2420;--muted:#7A6E66;--accent:#FF8A5B;--ok:#2F9E6E}
@media (prefers-color-scheme:dark){:root{--bg:#1C1917;--surface:#26221F;--border:#3A3430;--text:#F3EEE9;--muted:#A89F98}}
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;background:var(--bg);color:var(--text);font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.card{width:100%;max-width:400px;background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:28px}
h1{font-size:19px;margin:0 0 4px}p{font-size:13.5px;color:var(--muted);margin:0 0 18px;line-height:1.5}
.app{display:inline-block;background:var(--bg);border:1px solid var(--border);border-radius:999px;padding:3px 10px;font-size:12.5px;font-weight:600;color:var(--text)}
ul{margin:0 0 18px;padding-left:18px;font-size:13px;color:var(--muted);line-height:1.6}
label{display:flex;flex-direction:column;gap:6px;font-size:11.5px;font-weight:600;color:var(--muted);margin-bottom:14px}
input[type=text],input[type=password]{height:42px;padding:0 12px;border-radius:10px;border:1px solid var(--border);font-size:14px;background:var(--surface);color:var(--text)}
button{width:100%;height:44px;border:none;border-radius:10px;background:var(--accent);color:#fff;font-size:14px;font-weight:700;cursor:pointer}
.err{font-size:12.5px;color:#C63C3C;margin:-4px 0 12px}.note{font-size:11.5px;color:var(--muted);margin-top:14px;text-align:center}
</style></head><body><div class="card">${body}</div></body></html>`;
  return new Response(page, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Frame-Options': 'DENY' } });
}

function errorPage(message: string) {
  return html(`<h1>Không thể kết nối</h1><p>${esc(message)}</p><p>Vui lòng thử thêm connector lại từ đầu trong Claude/ChatGPT.</p>`, 400);
}

async function validate(params: AuthParams): Promise<{ clientName: string } | { error: string }> {
  if (params.response_type !== 'code') return { error: 'Yêu cầu không hợp lệ (response_type).' };
  if (!params.code_challenge || params.code_challenge_method !== 'S256') return { error: 'Yêu cầu không hợp lệ (PKCE).' };
  const { data } = await anonClient().rpc('mcp_client_info', { p_client_id: params.client_id || '' });
  if (!data) return { error: 'Ứng dụng AI chưa được đăng ký.' };
  if (!Array.isArray(data.redirect_uris) || !data.redirect_uris.includes(params.redirect_uri)) {
    return { error: 'Địa chỉ chuyển hướng không khớp.' };
  }
  return { clientName: data.client_name || 'Ứng dụng AI' };
}

function form(params: AuthParams, clientName: string, error = '', employeeId = '') {
  const hidden = FIELDS.map((f) => `<input type="hidden" name="${f}" value="${esc(params[f] || '')}">`).join('');
  return html(`<h1>Kết nối AI với ODE Project Manager</h1>
<p><span class="app">${esc(clientName)}</span> muốn <b>xem</b> dữ liệu công việc của bạn.</p>
<ul><li>Chỉ <b>đọc</b>: dự án, công việc, brief, danh sách nhân sự.</li><li>AI <b>không thể</b> thêm, sửa hay xoá bất cứ thứ gì.</li></ul>
<form method="post">${hidden}
<label>Mã nhân viên<input type="text" name="employee_id" required autocomplete="username" value="${esc(employeeId)}"></label>
<label>Mật khẩu<input type="password" name="password" required autocomplete="current-password"></label>
${error ? `<div class="err">${esc(error)}</div>` : ''}
<button type="submit">Đăng nhập &amp; Cho phép</button></form>
<div class="note">Phát triển bởi Ban Sáng tạo Media - ODE</div>`);
}

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const params = Object.fromEntries(FIELDS.map((f) => [f, sp.get(f) || ''])) as AuthParams;
  const v = await validate(params);
  if ('error' in v) return errorPage(v.error);
  return form(params, v.clientName);
}

export async function POST(req: Request) {
  const fd = await req.formData();
  const get = (k: string) => (typeof fd.get(k) === 'string' ? (fd.get(k) as string) : '');
  const params = Object.fromEntries(FIELDS.map((f) => [f, get(f)])) as AuthParams;
  const v = await validate(params);
  if ('error' in v) return errorPage(v.error);

  const employeeId = get('employee_id').trim();
  const password = get('password');

  const { data: signIn, error: signInError } = await anonClient().auth.signInWithPassword({
    email: employeeIdToEmail(employeeId),
    password
  });
  if (signInError || !signIn?.session) {
    return form(params, v.clientName, 'Mã nhân viên hoặc mật khẩu không đúng.', employeeId);
  }

  const { data: code, error: codeError } = await anonClient(signIn.session.access_token).rpc('mcp_issue_code', {
    p_client_id: params.client_id,
    p_redirect_uri: params.redirect_uri,
    p_code_challenge: params.code_challenge
  });
  if (codeError || !code) {
    return form(params, v.clientName, 'Tài khoản không còn hoạt động hoặc không thể cấp quyền.', employeeId);
  }

  const target = new URL(params.redirect_uri);
  target.searchParams.set('code', code as string);
  if (params.state) target.searchParams.set('state', params.state);
  return new Response(null, { status: 303, headers: { Location: target.toString(), 'Cache-Control': 'no-store' } });
}
