'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';
import { employeeIdToEmail } from '../../lib/employeeEmail';

export default function ActivateAccountPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<'verify' | 'setPassword'>('verify');
  const [employeeId, setEmployeeId] = useState('');
  const [phone, setPhone] = useState('');
  const [staffName, setStaffName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { data, error: rpcError } = await supabase.rpc('verify_staff_for_activation', {
      p_employee_id: employeeId,
      p_phone: phone
    });

    setLoading(false);

    if (rpcError || !data?.success) {
      setError('Không tìm thấy tài khoản khớp Mã nhân viên và Số điện thoại này.');
      return;
    }

    setStaffName(data.name as string);
    setStep('setPassword');
  }

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('Mật khẩu cần ít nhất 6 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu nhập lại không khớp.');
      return;
    }

    setLoading(true);

    const { data, error: rpcError } = await supabase.rpc('activate_account', {
      p_employee_id: employeeId,
      p_phone: phone,
      p_new_password: newPassword
    });

    if (rpcError || !data?.success) {
      setLoading(false);
      setError('Không đặt được mật khẩu, thử lại sau.');
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: employeeIdToEmail(employeeId),
      password: newPassword
    });

    setLoading(false);

    if (signInError) {
      setError('Đặt mật khẩu thành công nhưng đăng nhập tự động thất bại — anh/chị vào lại trang đăng nhập.');
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
      <div
        style={{
          width: 340,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 20,
          padding: 32
        }}
      >
        <h1 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px' }}>
          {step === 'verify' ? 'Kích hoạt tài khoản' : `Xin chào, ${staffName}!`}
        </h1>
        <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 24px' }}>
          {step === 'verify'
            ? 'Nhập Mã nhân viên và Số điện thoại của anh/chị để đặt mật khẩu đăng nhập.'
            : 'Đặt mật khẩu riêng cho tài khoản của anh/chị.'}
        </p>

        {step === 'verify' && (
          <form onSubmit={handleVerify}>
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
                style={inputStyle}
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
              Số điện thoại
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                placeholder="VD: 0912345678"
                style={inputStyle}
              />
            </label>

            {error && <div style={{ fontSize: 12.5, color: '#C63C3C', marginBottom: 10 }}>{error}</div>}

            <button type="submit" disabled={loading} style={buttonStyle(loading)}>
              {loading ? 'Đang kiểm tra...' : 'Tiếp tục'}
            </button>
          </form>
        )}

        {step === 'setPassword' && (
          <form onSubmit={handleSetPassword}>
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
                style={inputStyle}
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
                style={inputStyle}
              />
            </label>

            {error && <div style={{ fontSize: 12.5, color: '#C63C3C', marginBottom: 10 }}>{error}</div>}

            <button type="submit" disabled={loading} style={buttonStyle(loading)}>
              {loading ? 'Đang lưu...' : 'Xác nhận và vào hệ thống'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  height: 42,
  padding: '0 12px',
  borderRadius: 10,
  border: '1px solid var(--border)',
  fontSize: 14
};

function buttonStyle(loading: boolean): React.CSSProperties {
  return {
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
  };
}
