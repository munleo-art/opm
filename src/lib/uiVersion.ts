import { createClient } from './supabase/client';

// Chọn "Giao diện cũ / Giao diện mới" theo từng tài khoản (cột staff.ui_version).
// Mặc định luôn là giao diện CŨ. Nếu database chưa có cột ui_version thì tạm nhớ trên trình duyệt.
export type UiVersion = 'old' | 'new';

const LS_KEY = 'ode-ui-version';

export function readUiVersion(me: { ui_version?: string | null } | null): UiVersion {
  const fromAccount = me?.ui_version;
  if (fromAccount === 'new' || fromAccount === 'old') return fromAccount;
  try {
    return localStorage.getItem(LS_KEY) === 'new' ? 'new' : 'old';
  } catch {
    return 'old';
  }
}

export async function saveUiVersion(staffId: string | null | undefined, v: UiVersion) {
  try {
    localStorage.setItem(LS_KEY, v);
  } catch {
    /* bỏ qua */
  }
  if (!staffId) return;
  // Lỗi (vd chưa chạy SQL thêm cột) thì bỏ qua — lựa chọn vẫn được nhớ trên trình duyệt.
  await createClient().from('staff').update({ ui_version: v }).eq('id', staffId);
}
