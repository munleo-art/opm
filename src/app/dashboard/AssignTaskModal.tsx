'use client';

import { useEffect, useState } from 'react';
import { createClient } from '../../lib/supabase/client';
import type { Project, Staff, Brief } from '../../lib/types';
import { defaultChecklistTemplate } from '../../lib/checklist';
import { visibleStaff } from '../../lib/permissions';

const TASK_TYPES = ['Kịch bản TVC', 'Kịch bản Live Stream'];
const ASSIGNABLE_DEPTS = ['Ban Sáng tạo'];
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));

export default function AssignTaskModal({
  project,
  me,
  allStaff,
  briefs,
  onClose,
  onCreated
}: {
  project: Project;
  me: Staff;
  allStaff: Staff[];
  briefs: Brief[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const supabase = createClient();
  const [taskType, setTaskType] = useState(TASK_TYPES[0]);
  const [taskName, setTaskName] = useState('');
  const [briefLink, setBriefLink] = useState('');
  const assignable = visibleStaff(allStaff, me).filter((s) => ASSIGNABLE_DEPTS.includes(s.department?.name ?? ''));
  const [assigneeId, setAssigneeId] = useState(assignable[0]?.id ?? '');
  const [deadlineDate, setDeadlineDate] = useState('');
  const [deadlineHour, setDeadlineHour] = useState('09');
  const [saving, setSaving] = useState(false);

  // Link brief đã được sử dụng cho một công việc khác (khoá theo link_url, vì tasks.brief_link không phải khoá ngoại)
  const [claimedLinks, setClaimedLinks] = useState<Set<string>>(new Set());
  // id brief đang chọn từ dropdown Marketing ('' = chưa chọn / đang nhập tay)
  const [selectedBriefId, setSelectedBriefId] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from('tasks').select('brief_link').not('brief_link', 'is', null);
      if (!cancelled && data) {
        setClaimedLinks(new Set(data.map((t: { brief_link: string | null }) => t.brief_link as string)));
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const availableBriefs = briefs.filter((b) => !!b.link_url && !claimedLinks.has(b.link_url));

  const canCreate = !!assigneeId && !!deadlineDate;

  function handlePickBrief(id: string) {
    setSelectedBriefId(id);
    if (!id) return;
    const b = availableBriefs.find((x) => x.id === id);
    if (b) setBriefLink(b.link_url || '');
  }

  function handleManualLinkChange(v: string) {
    setSelectedBriefId('');
    setBriefLink(v);
  }

  async function handleCreate() {
    if (!canCreate) return;
    setSaving(true);
    const deadline = new Date(`${deadlineDate}T${deadlineHour}:00:00`);

    const { data: newTask, error } = await supabase
      .from('tasks')
      .insert({
        project_id: project.id,
        assignee_id: assigneeId,
        task_type: taskType,
        task_name: taskName || null,
        brief_link: briefLink || null,
        deadline: deadline.toISOString(),
        created_by: me.id
      })
      .select()
      .single();

    if (error || !newTask) {
      setSaving(false);
      alert('Không tạo được công việc: ' + (error?.message || ''));
      return;
    }

    const items = defaultChecklistTemplate().map((it) => ({ ...it, task_id: newTask.id }));
    await supabase.from('checklist_items').insert(items);

    setSaving(false);
    onCreated();
    onClose();
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(20,20,19,0.4)', zIndex: 100 }}
      />
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%,-50%)',
          width: 460,
          maxWidth: '92vw',
          maxHeight: '86vh',
          overflowY: 'auto',
          background: 'var(--surface)',
          color: 'var(--text)',
          borderRadius: 20,
          padding: 26,
          zIndex: 101,
          boxShadow: '0 24px 60px rgba(20,20,19,0.3)'
        }}
      >
        <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 20 }}>Giao việc mới</div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 12.5, color: 'var(--muted)', marginBottom: 6 }}>
            Loại công việc
          </label>
          <select
            value={taskType}
            onChange={(e) => setTaskType(e.target.value)}
            style={{
              width: '100%',
              height: 42,
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'var(--bg)',
              color: 'var(--text)',
              padding: '0 12px',
              fontSize: 13.5,
              boxSizing: 'border-box'
            }}
          >
            {TASK_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 12.5, color: 'var(--muted)', marginBottom: 6 }}>
            Tên công việc (không bắt buộc)
          </label>
          <input
            value={taskName}
            onChange={(e) => setTaskName(e.target.value)}
            placeholder="Nhập tên công việc..."
            style={{
              width: '100%',
              height: 42,
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'var(--bg)',
              color: 'var(--text)',
              padding: '0 12px',
              fontSize: 13.5,
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 12.5, color: 'var(--muted)', marginBottom: 6 }}>
            Link brief từ Marketing{availableBriefs.length === 0 ? ' (hiện không có brief nào còn trống)' : ''}
          </label>
          <select
            value={selectedBriefId}
            onChange={(e) => handlePickBrief(e.target.value)}
            style={{
              width: '100%',
              height: 42,
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'var(--bg)',
              color: 'var(--text)',
              padding: '0 12px',
              fontSize: 13.5,
              marginBottom: 10,
              boxSizing: 'border-box'
            }}
          >
            <option value="">— Chọn brief có sẵn —</option>
            {availableBriefs.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title}
              </option>
            ))}
          </select>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', margin: '2px 0 8px' }}>
            hoặc tự dán link brief:
          </div>
          <input
            value={briefLink}
            onChange={(e) => handleManualLinkChange(e.target.value)}
            placeholder="Dán link brief..."
            style={{
              width: '100%',
              height: 42,
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'var(--bg)',
              color: 'var(--text)',
              padding: '0 12px',
              fontSize: 13.5,
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 12.5, color: 'var(--muted)', marginBottom: 6 }}>
            Giao cho
          </label>
          <select
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            style={{
              width: '100%',
              height: 42,
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'var(--bg)',
              color: 'var(--text)',
              padding: '0 12px',
              fontSize: 13.5,
              boxSizing: 'border-box'
            }}
          >
            {assignable.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 22, display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: 12.5, color: 'var(--muted)', marginBottom: 6 }}>
              Ngày hết hạn
            </label>
            <input
              type="date"
              value={deadlineDate}
              onChange={(e) => setDeadlineDate(e.target.value)}
              style={{
                width: '100%',
                height: 42,
                borderRadius: 10,
                border: '1px solid var(--border)',
                background: 'var(--bg)',
                color: 'var(--text)',
                padding: '0 12px',
                fontSize: 13.5,
                boxSizing: 'border-box'
              }}
            />
          </div>
          <div style={{ width: 100 }}>
            <label style={{ display: 'block', fontSize: 12.5, color: 'var(--muted)', marginBottom: 6 }}>
              Giờ
            </label>
            <select
              value={deadlineHour}
              onChange={(e) => setDeadlineHour(e.target.value)}
              style={{
                width: '100%',
                height: 42,
                borderRadius: 10,
                border: '1px solid var(--border)',
                background: 'var(--bg)',
                color: 'var(--text)',
                padding: '0 8px',
                fontSize: 13.5,
                boxSizing: 'border-box'
              }}
            >
              {HOURS.map((h) => (
                <option key={h} value={h}>
                  {h}:00
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              height: 42,
              padding: '0 20px',
              borderRadius: 10,
              border: 'none',
              background: 'var(--chip)',
              color: 'var(--text)',
              fontSize: 13.5,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Hủy
          </button>
          <button
            onClick={handleCreate}
            disabled={!canCreate || saving}
            style={{
              height: 42,
              padding: '0 20px',
              borderRadius: 10,
              border: 'none',
              background: 'var(--text)',
              color: 'var(--accent-contrast)',
              fontSize: 13.5,
              fontWeight: 600,
              cursor: !canCreate || saving ? 'default' : 'pointer',
              opacity: !canCreate || saving ? 0.6 : 1
            }}
          >
            {saving ? 'Đang lưu…' : 'Giao việc'}
          </button>
        </div>
      </div>
    </>
  );
}
