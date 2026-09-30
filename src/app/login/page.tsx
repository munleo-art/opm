'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';
import { employeeIdToEmail } from '../../lib/employeeEmail';

export default function LoginPage() {
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: employeeIdToEmail(employeeId),
      password
    });

    setLoading(false);

    if (signInError) {
      setError('Mã nhân viên hoặc mật khẩu không đúng.');
      return;
    }

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
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 4px' }}>
          ODE PROJECT MANAGER
        </h1>
        <p style={{ fontSize: 13.5, color: 'var(--muted)', margin: '0 0 24px' }}>
          Chào mừng quay lại! Đăng nhập để tiếp tục.
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
          Mã nhân viên
          <input
            type="text"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            required
            placeholder="VD: NV-1001"
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
          Mật khẩu
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                height: 42,
                padding: '0 40px 0 12px',
                borderRadius: 10,
                border: '1px solid var(--border)',
                fontSize: 14,
                boxSizing: 'border-box'
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              style={{
                position: 'absolute',
                right: 8,
                top: 0,
                height: 42,
                border: 'none',
                background: 'transparent',
                fontSize: 12,
                color: 'var(--muted)',
                cursor: 'pointer'
              }}
            >
              {showPassword ? 'Ẩn' : 'Hiện'}
            </button>
          </div>
        </label>

        {error && (
          <div style={{ fontSize: 12.5, color: '#C63C3C', marginBottom: 10 }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
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
            cursor: loading ? 'default' : 'pointer',
            opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>

        <a
          href="/kich-hoat"
          style={{
            display: 'block',
            textAlign: 'center',
            marginTop: 16,
            fontSize: 12.5,
            color: 'var(--muted)'
          }}
        >
          Chưa có mật khẩu? Kích hoạt tài khoản tại đây
        </a>
      </form>
    </div>
  );
}
