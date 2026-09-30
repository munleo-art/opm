'use client';

import type { Staff } from '../../lib/types';
import Avatar from './Avatar';

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 12,
        padding: '10px 14px',
        borderBottom: last ? 'none' : '1px solid var(--border)',
        fontSize: 12.5
      }}
    >
      <div style={{ color: 'var(--muted)' }}>{label}</div>
      <div style={{ fontWeight: 600, textAlign: 'right' }}>{value || '—'}</div>
    </div>
  );
}

export default function StaffInfoModal({ staff, onClose }: { staff: Staff; onClose: () => void }) {
  return (
    <div>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(20,20,19,0.45)', zIndex: 150 }} />
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%,-50%)',
          width: 340,
          background: 'var(--surface)',
          borderRadius: 20,
          padding: 24,
          zIndex: 151
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: 16, cursor: 'pointer' }}>
            ✕
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginTop: -8, marginBottom: 20 }}>
          <Avatar me={staff} size={80} />
          <div style={{ fontSize: 17, fontWeight: 700 }}>{staff.name}</div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{staff.position || staff.permission}</div>
        </div>

        <div style={{ border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
          <InfoRow label="Mã nhân viên" value={staff.employee_id} />
          <InfoRow label="Ban" value={staff.department?.name ?? ''} />
          <InfoRow label="Chức vụ" value={staff.position ?? ''} />
          <InfoRow label="Số điện thoại" value={staff.phone ?? ''} />
          <InfoRow label="Phân quyền" value={staff.permission} last />
        </div>
      </div>
    </div>
  );
}
