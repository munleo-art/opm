'use client';

import { useState } from 'react';
import { createClient } from '../../lib/supabase/client';
import type { Project, Staff } from '../../lib/types';
import DatePicker from './DatePicker';

export default function AddBriefModal({
  project,
  me,
  onClose,
  onCreated
}: {
  project: Project;
  me: Staff;
  onClose: () => void;
  onCreated: () => void;
}) {
  const supabase = createClient();
  const [title, setTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [deadline, setDeadline] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!title.trim()) return;
    setSaving(true);
    await supabase.from('briefs').insert({
      project_id: project.id,
      title: title.trim(),
      link_url: linkUrl || null,
      deadline: deadline || null,
      posted_by: me.id
    });
    setSaving(false);
    onCreated();
  }

  return (
    <div>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(20,20,19,0.45)', zIndex: 130 }} />
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
          zIndex: 131
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Thêm brief</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: 16, cursor: 'pointer' }}>
            ✕
          </button>
        </div>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11.5, fontWeight: 600, color: 'var(--muted)', marginBottom: 12 }}>
          Tên công việc
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="VD: Brief truyền thông mở bán Q4"
            style={inputStyle}
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11.5, fontWeight: 600, color: 'var(--muted)', marginBottom: 12 }}>
          Link brief
          <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="Dán link tài liệu brief" style={inputStyle} />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11.5, fontWeight: 600, color: 'var(--muted)', marginBottom: 18 }}>
          Deadline mong muốn
          <DatePicker value={deadline} onChange={setDeadline} />
        </label>

        <button
          onClick={handleCreate}
          disabled={!title.trim() || saving}
          style={{
            width: '100%',
            height: 42,
            borderRadius: 9,
            border: 'none',
            background: title.trim() ? 'var(--accent)' : 'var(--border)',
            color: title.trim() ? 'var(--accent-contrast)' : 'var(--muted)',
            fontSize: 13.5,
            fontWeight: 700,
            cursor: title.trim() ? 'pointer' : 'default'
          }}
        >
          {saving ? 'Đang lưu...' : 'Lưu'}
        </button>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  height: 40,
  padding: '0 10px',
  borderRadius: 9,
  border: '1px solid var(--border)',
  fontSize: 13
};
