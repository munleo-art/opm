'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('Mật khẩu mới cần ít nhất 6 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu nhập lại không khớp.');
      return;
    }

    setSaving(true);
    const supabase = createClient();

    const { data: userData } = await supabase.auth.getUser();
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

    if (updateError) {
      setSaving(false);
      setError('Không đổi được mật khẩu, thử lại sau.');
      return;
    }

    if (userData.user) {
      await supabase
        .from('staff')
        .update({ must_change_password: false })
        .eq('auth_user_id', userData.user.id);
    }

    setSaving(false);
    router.push('/dashboard');
    router.refresh();
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: 340,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 20,
          padding: 32
        }}
      >
        <h1 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px' }}>Đổi mật khẩu</h1>
        <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 24px' }}>
          Đây là lần đăng nhập đầu tiên — anh/chị cần đặt mật khẩu mới trước khi tiếp tục.
        </p>

        <label
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            fontSize: 11.5,
            fontWeight: 600,
            color: 'var(--muted)',
            marginBottom: 14
          }}
        >
          Mật khẩu mới
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            style={{
              height: 42,
              padding: '0 12px',
              borderRadius: 10,
              border: '1px solid var(--border)',
              fontSize: 14
            }}
          />
        </label>

        <label
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            fontSize: 11.5,
            fontWeight: 600,
            color: 'var(--muted)',
            marginBottom: 8
          }}
        >
          Nhập lại mật khẩu mới
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            style={{
              height: 42,
              padding: '0 12px',
              borderRadius: 10,
              border: '1px solid var(--border)',
              fontSize: 14
            }}
          />
        </label>

        {error && (
          <div style={{ fontSize: 12.5, color: '#C63C3C', marginBottom: 10 }}>{error}</div>
        )}

        <button
          type="submit"
          disabled={saving}
          style={{
            width: '100%',
            height: 44,
            marginTop: 10,
            borderRadius: 10,
            border: 'none',
            background: 'var(--accent)',
            color: 'var(--accent-contrast)',
            fontSize: 14,
            fontWeight: 700,
            cursor: saving ? 'default' : 'pointer',
            opacity: saving ? 0.7 : 1
          }}
        >
          {saving ? 'Đang lưu...' : 'Xác nhận'}
        </button>
      </form>
    </div>
  );
}
