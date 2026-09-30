'use client';

import { useState } from 'react';
import { createClient } from '../../lib/supabase/client';
import type { Staff } from '../../lib/types';

const GROUPS = ['BĐS Miền Bắc', 'BĐS Miền Trung', 'BĐS Miền Nam', 'SSG', 'SCG', 'KLB'];

export default function AddProjectModal({
  me,
  onClose,
  onCreated
}: {
  me: Staff;
  onClose: () => void;
  onCreated: () => void;
}) {
  const supabase = createClient();
  const [title, setTitle] = useState('');
  const [group, setGroup] = useState(GROUPS[0]);
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!title.trim()) return;
    setSaving(true);
    await supabase.from('projects').insert({
      title: title.trim(),
      group_name: group,
      status_kind: 'idea',
      status_label: 'Lên ý tưởng',
      created_by: me.id
    });
    setSaving(false);
    onCreated();
  }

  return (
    <div>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(20,20,19,0.45)', zIndex: 110 }}
      />
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%,-50%)',
          width: 360,
          background: 'var(--surface)',
          borderRadius: 20,
          padding: 24,
          zIndex: 111
        }}
      >
        <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700 }}>Thêm dự án</h3>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11.5, fontWeight: 600, color: 'var(--muted)', marginBottom: 14 }}>
          Tên dự án
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ height: 40, padding: '0 10px', borderRadius: 9, border: '1px solid var(--border)', fontSize: 13 }}
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11.5, fontWeight: 600, color: 'var(--muted)', marginBottom: 18 }}>
          Thuộc nhóm
          <select
            value={group}
            onChange={(e) => setGroup(e.target.value)}
            style={{ height: 40, padding: '0 10px', borderRadius: 9, border: '1px solid var(--border)', fontSize: 13 }}
          >
            {GROUPS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>

        <button
          onClick={handleCreate}
          disabled={!title.trim() || saving}
          style={{
            width: '100%',
            height: 44,
            borderRadius: 10,
            border: 'none',
            background: title.trim() ? 'var(--accent)' : 'var(--border)',
            color: title.trim() ? 'var(--accent-contrast)' : 'var(--muted)',
            fontSize: 14,
            fontWeight: 700,
            cursor: title.trim() ? 'pointer' : 'default'
          }}
        >
          {saving ? 'Đang tạo...' : 'Tạo dự án'}
        </button>
      </div>
    </div>
  );
}
