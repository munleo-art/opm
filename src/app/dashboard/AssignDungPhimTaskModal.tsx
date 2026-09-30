'use client';

import { useState } from 'react';
import { createClient } from '../../lib/supabase/client';
import type { Project, Staff, Brief } from '../../lib/types';
import { defaultDungPhimChecklistTemplate } from '../../lib/checklist';
import DatePicker from './DatePicker';
import { visibleStaff } from '../../lib/permissions';

// Danh sách hạng mục triển khai — tạm để xuất, anh điều chỉnh lại cho khớp thực tế.
const DUNGPHIM_CATEGORIES = ['TVC 15s', 'TVC 30s', 'TVC 45s', 'TVC 60s', 'Video Livestream', 'Video sự kiện'];

export default function AssignDungPhimTaskModal({
  me,
  allStaff,
  projects,
  briefs,
  project,
  onClose,
  onCreated
}: {
  me: Staff;
  allStaff: Staff[];
  projects: Project[];
  briefs: Brief[];
  project?: Project;
  onClose: () => void;
  onCreated: () => void;
}) {
  const supabase = createClient();

  const [projectQuery, setProjectQuery] = useState(project?.title ?? '');
  const [selectedProjectId, setSelectedProjectId] = useState(project?.id ?? '');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [category, setCategory] = useState(DUNGPHIM_CATEGORIES[0]);
  const [briefLink, setBriefLink] = useState('');
  const dungPhimStaff = visibleStaff(allStaff, me).filter((s) => s.department?.name === 'Team Dựng phim');
  const [assigneeId, setAssigneeId] = useState(dungPhimStaff[0]?.id ?? '');
  const [deadlineDate, setDeadlineDate] = useState('');
  const [deadlineHour, setDeadlineHour] = useState('09');
  const [saving, setSaving] = useState(false);

  const suggestions = projectQuery.trim()
    ? projects.filter((p) => p.title.toLowerCase().includes(projectQuery.trim().toLowerCase())).slice(0, 8)
    : [];

  const projectBriefs = briefs.filter((b) => b.project_id === selectedProjectId);

  const canCreate = !!selectedProjectId && !!assigneeId && !!deadlineDate;

  function pickProject(p: Project) {
    setSelectedProjectId(p.id);
    setProjectQuery(p.title);
    setShowSuggestions(false);
    setBriefLink('');
  }

  async function handleCreate() {
    if (!canCreate) return;
    setSaving(true);
    const deadline = new Date(`${deadlineDate}T${deadlineHour}:00:00`);

    const { data: newTask, error } = await supabase
      .from('tasks')
      .insert({
        project_id: selectedProjectId,
        assignee_id: assigneeId,
        task_type: category,
        task_name: null,
        deadline: deadline.toISOString(),
        brief_link: briefLink || null,
        created_by: me.id
      })
      .select()
      .single();

    if (!error && newTask) {
      const template = defaultDungPhimChecklistTemplate().map((t) => ({ ...t, task_id: newTask.id }));
      await supabase.from('checklist_items').insert(template);
    }

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
          width: 380,
          background: 'var(--surface)',
          borderRadius: 20,
          padding: 24,
          zIndex: 131
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Giao việc — Team Dựng phim</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: 16, cursor: 'pointer' }}>
            ✕
          </button>
        </div>

        {project ? (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--muted)', marginBottom: 4 }}>Dự án</div>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>{project.title}</div>
          </div>
        ) : (
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11.5, fontWeight: 600, color: 'var(--muted)', marginBottom: 12, position: 'relative' }}>
            Tên dự án
            <input
              value={projectQuery}
              onChange={(e) => {
                setProjectQuery(e.target.value);
                setSelectedProjectId('');
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Gõ để tìm dự án..."
              style={inputStyle}
            />
            {showSuggestions && suggestions.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: 62,
                  left: 0,
                  right: 0,
                  maxHeight: 200,
                  overflowY: 'auto',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 9,
                  boxShadow: '0 12px 30px rgba(20,20,19,0.16)',
                  zIndex: 132
                }}
              >
                {suggestions.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => pickProject(p)}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '8px 10px',
                      border: 'none',
                      background: 'transparent',
                      fontSize: 12.5,
                      cursor: 'pointer'
                    }}
                  >
                    {p.title}
                    <span style={{ color: 'var(--muted-2)', fontSize: 11 }}> - {p.group_name}</span>
                  </button>
                ))}
              </div>
            )}
            {!selectedProjectId && projectQuery.trim() && (
              <span style={{ fontSize: 10.5, color: '#C27600', fontWeight: 400 }}>Chọn 1 dự án từ danh sách gợi ý</span>
            )}
          </label>
        )}

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11.5, fontWeight: 600, color: 'var(--muted)', marginBottom: 12 }}>
          Hạng mục triển khai
          <select value={category} onChange={(e) => setCategory(e.target.value)} style={inputStyle}>
            {DUNGPHIM_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11.5, fontWeight: 600, color: 'var(--muted)', marginBottom: 12 }}>
          Link brief
          <select value={briefLink} onChange={(e) => setBriefLink(e.target.value)} style={inputStyle}>
            <option value="">— Không có brief phù hợp —</option>
            {projectBriefs.map((b) => (
              <option key={b.id} value={b.link_url ?? b.title}>
                {b.title}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11.5, fontWeight: 600, color: 'var(--muted)', marginBottom: 12 }}>
          Nhân sự triển khai
          <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} style={inputStyle}>
            {dungPhimStaff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11.5, fontWeight: 600, color: 'var(--muted)', marginBottom: 18 }}>
          Deadline
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1.4 }}>
              <DatePicker value={deadlineDate} onChange={setDeadlineDate} />
            </div>
            <select value={deadlineHour} onChange={(e) => setDeadlineHour(e.target.value)} style={{ ...inputStyle, flex: 1 }}>
              {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).map((h) => (
                <option key={h} value={h}>
                  {h}:00
                </option>
              ))}
            </select>
          </div>
        </label>

        <button
          onClick={handleCreate}
          disabled={!canCreate || saving}
          style={{
            width: '100%',
            height: 42,
            borderRadius: 9,
            border: 'none',
            background: canCreate ? 'var(--accent)' : 'var(--border)',
            color: canCreate ? 'var(--accent-contrast)' : 'var(--muted)',
            fontSize: 13.5,
            fontWeight: 700,
            cursor: canCreate ? 'pointer' : 'default'
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
