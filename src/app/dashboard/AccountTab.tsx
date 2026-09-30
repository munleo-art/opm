'use client';

import { useRef, useState } from 'react';
import { createClient } from '../../lib/supabase/client';
import type { Staff } from '../../lib/types';
import Avatar from './Avatar';
import Link from 'next/link';
import { canSeeAdmin } from '../../lib/permissions';

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 12,
        padding: '12px 16px',
        borderBottom: last ? 'none' : '1px solid var(--border)',
        fontSize: 13
      }}
    >
      <div style={{ color: 'var(--muted)' }}>{label}</div>
      <div style={{ fontWeight: 600, textAlign: 'right' }}>{value || '—'}</div>
    </div>
  );
}

export default function AccountTab({ me, onRefetch }: { me: Staff | null; onRefetch: () => void }) {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  if (!me) return null;

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !me) return;

    if (!file.type.startsWith('image/')) {
      setError('Vui lòng chọn một file ảnh.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Ảnh không được quá 5MB.');
      return;
    }

    setError('');
    setUploading(true);

    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${me.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      setError('Không tải ảnh lên được: ' + uploadError.message);
      setUploading(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(path);
    const newAvatarUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;

    const { error: updateError } = await supabase
      .from('staff')
      .update({ avatar_url: newAvatarUrl })
      .eq('id', me.id);

    setUploading(false);

    if (updateError) {
      setError('Không cập nhật được ảnh đại diện: ' + updateError.message);
      return;
    }

    onRefetch();
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '40px 0 80px' }}>
      <div style={{ position: 'relative', width: 76, height: 76, marginBottom: 16 }}>
        <Avatar staff={me} size={76} />
        <button
          onClick={() => fileInputRef.current?.click()}
          aria-label="Đổi ảnh đại diện"
          title="Đổi ảnh đại diện"
          disabled={uploading}
          style={{
            position: 'absolute',
            bottom: -2,
            right: -2,
            width: 26,
            height: 26,
            borderRadius: '50%',
            background: 'var(--text)',
            border: '2px solid var(--surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: uploading ? 'default' : 'pointer'
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent-contrast)" strokeWidth="2.2" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelected}
          style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
        />
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--muted)', margin: '-8px 0 24px' }}>
        {uploading ? 'Đang tải ảnh lên…' : 'Bấm dấu + trên ảnh để đổi ảnh đại diện.'}
      </div>
      {error && <div style={{ fontSize: 12.5, color: '#C63C3C', margin: '-16px 0 20px' }}>{error}</div>}

      <h1 style={{ margin: '0 0 24px', fontSize: 22, fontWeight: 600 }}>Thông tin tài khoản</h1>

      <div style={{ border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', background: 'var(--surface)' }}>
        <InfoRow label="Tên" value={me.name} />
        <InfoRow label="Ngày sinh" value={me.date_of_birth || ''} />
        <InfoRow label="Mã nhân viên" value={me.employee_id} />
        <InfoRow label="Phòng ban" value={me.department?.name || ''} />
        <InfoRow label="Chức vụ" value={me.position || ''} />
        <InfoRow label="Số điện thoại" value={me.phone || ''} last />
      </div>

      {canSeeAdmin(me) && (
        <div style={{ marginTop: 24 }}>
          <Link
            href="/admin"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              height: 44,
              padding: '0 20px',
              borderRadius: 10,
              background: 'var(--text)',
              color: 'var(--accent-contrast)',
              fontSize: 14,
              fontWeight: 600
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
              <path d="M19.4 13a7.4 7.4 0 0 0 .1-2l2-1.5-2-3.4-2.3.9a7.6 7.6 0 0 0-1.7-1l-.4-2.5h-4l-.4 2.5a7.6 7.6 0 0 0-1.7 1l-2.3-.9-2 3.4 2 1.5a7.4 7.4 0 0 0 0 2l-2 1.5 2 3.4 2.3-.9a7.6 7.6 0 0 0 1.7 1l.4 2.5h4l.4-2.5a7.6 7.6 0 0 0 1.7-1l2.3.9 2-3.4-2-1.5Z" />
            </svg>
            Trang quản trị
          </Link>
        </div>
      )}
    </div>
  );
}
