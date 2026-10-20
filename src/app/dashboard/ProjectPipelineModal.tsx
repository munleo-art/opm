'use client';

import { useState } from 'react';
import { createClient } from '../../lib/supabase/client';
import type { Project, Staff, Department } from '../../lib/types';

const GROUP_OPTIONS = ['BĐS Miền Bắc', 'BĐS Miền Trung', 'BĐS Miền Nam', 'SSG', 'SCG', 'KLB'];

// Nút + : chỉ tạo DỰ ÁN MỚI (tên + nhóm). Đầu việc thêm sau, trong cửa sổ dự án → "Thêm đầu việc".
// Dự án chưa có đầu việc nằm cuối Dashboard, màu xám.
export default function ProjectPipelineModal({
  projects,
  me,
  onClose,
  onSaved
}: {
  projects: Project[];
  allStaff?: Staff[];
  departments?: Department[];
  me: Staff;
  onClose: () => void;
  onSaved: () => void;
}) {
  const supabase = createClient();
  const [title, setTitle] = useState('');
  const [groupName, setGroupName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const existing = projects.find((p) => p.title.trim().toLowerCase() === title.trim().toLowerCase()) ?? null;
  const canSave = !!title.trim() && !!groupName && !existing && !saving;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setError('');
    const { error: insertErr } = await supabase
      .from('projects')
      .insert({ title: title.trim(), group_name: groupName, created_by: me.id });
    setSaving(false);
    if (insertErr) {
      setError('Không tạo được dự án: ' + insertErr.message);
      return;
    }
    onSaved();
  }

  const labelStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    fontSize: 11.5,
    fontWeight: 600,
    color: 'var(--muted)',
    marginBottom: 12
  };

  const inputStyle: React.CSSProperties = {
    height: 40,
    padding: '0 10px',
    borderRadius: 9,
    border: '1px solid var(--border)',
    fontSize: 13,
    background: 'var(--surface)',
    color: 'var(--text)'
  };

  return (
    <div>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(20,20,19,0.45)', zIndex: 140 }} />
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%,-50%)',
          width: 420,
          maxWidth: '92vw',
          maxHeight: '88vh',
          overflowY: 'auto',
          background: 'var(--surface)',
          color: 'var(--text)',
          borderRadius: 20,
          padding: 24,
          zIndex: 141
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>➕ Tạo dự án mới</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: 16, cursor: 'pointer', color: 'var(--text)' }}>
            ✕
          </button>
        </div>

        {error && (
          <div
            style={{
              background: '#FDECEC',
              border: '1px solid #F3B4B4',
              borderRadius: 10,
              padding: '10px 12px',
              marginBottom: 14,
              fontSize: 12,
              color: 'var(--st-red)',
              lineHeight: 1.4
            }}
          >
            {error}
          </div>
        )}

        <label style={labelStyle}>
          Tên dự án
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nhập tên dự án mới..." style={inputStyle} autoFocus />
        </label>
        {existing && (
          <div style={{ marginTop: -6, marginBottom: 12, fontSize: 12, color: 'var(--st-orange)', lineHeight: 1.4 }}>
            Dự án &quot;{existing.title}&quot; đã có. Muốn thêm đầu việc thì bấm vào dự án đó ở Dashboard → Thêm đầu việc.
          </div>
        )}

        <label style={labelStyle}>
          Nhóm
          <select value={groupName} onChange={(e) => setGroupName(e.target.value)} style={inputStyle}>
            <option value="">— Chọn nhóm —</option>
            {GROUP_OPTIONS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>

        <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 14 }}>
          Dự án mới sẽ nằm cuối Dashboard (màu xám) cho tới khi có đầu việc. Bấm vào tên dự án → Thêm đầu việc.
        </div>

        <button
          onClick={handleSave}
          disabled={!canSave}
          style={{
            width: '100%',
            height: 42,
            borderRadius: 9,
            border: 'none',
            background: canSave ? 'var(--accent)' : 'var(--border)',
            color: canSave ? 'var(--accent-contrast)' : 'var(--muted)',
            fontSize: 13.5,
            fontWeight: 700,
            cursor: canSave ? 'pointer' : 'default'
          }}
        >
          {saving ? 'Đang lưu...' : 'Tạo dự án'}
        </button>
      </div>
    </div>
  );
}
