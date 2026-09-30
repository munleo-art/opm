'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      style={{
        height: 36,
        padding: '0 14px',
        borderRadius: 10,
        border: '1px solid var(--border)',
        background: 'transparent',
        fontSize: 13,
        cursor: 'pointer'
      }}
    >
      Đăng xuất
    </button>
  );
}
