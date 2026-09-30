'use client';

import { createClient } from '../../lib/supabase/client';
import type { Task, Project, Staff, ChecklistItem } from '../../lib/types';
import { canEditTaskChecklist } from '../../lib/permissions';
import { computeNextLabel } from '../../lib/checklist';

export default function ChecklistModal({
  task,
  project,
  me,
  onClose,
  onRefetch
}: {
  task: Task;
  project: Project;
  me: Staff | null;
  onClose: () => void;
  onRefetch: () => void;
}) {
  const supabase = createClient();
  const items = (task.checklist_items ?? []).slice().sort((a, b) => a.sort_order - b.sort_order);
  const canEdit = canEditTaskChecklist(me, task);

  async function toggle(item: ChecklistItem) {
    if (!canEdit) return;
    await supabase.from('checklist_items').update({ checked: !item.checked }).eq('id', item.id);
    onRefetch();
  }

  async function deleteItem(item: ChecklistItem) {
    if (!canEdit) return;
    await supabase.from('checklist_items').delete().eq('id', item.id);
    onRefetch();
  }

  async function addNext(group: string, baseLabel: string) {
    if (!canEdit) return;
    const label = computeNextLabel(items, group, baseLabel);
    const maxSort = items.reduce((mx, i) => Math.max(mx, i.sort_order), 0);
    await supabase.from('checklist_items').insert({
      task_id: task.id,
      label,
      item_group: group,
      checked: false,
      sort_order: maxSort + 1
    });
    onRefetch();
  }

  const INCREMENTABLE_GROUPS: Record<string, string> = {
    script: 'Duyệt kịch bản',
    build: 'Check bản dựng TVC',
    dung: 'Dựng'
  };
  const presentGroups = Array.from(new Set(items.map((i) => i.item_group))).filter(
    (g) => g in INCREMENTABLE_GROUPS
  );

  return (
    <div>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(20,20,19,0.45)', zIndex: 120 }} />
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%,-50%)',
          width: 380,
          maxHeight: '80vh',
          overflowY: 'auto',
          background: 'var(--surface)',
          borderRadius: 20,
          padding: 24,
          zIndex: 121
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{task.task_name || task.task_type}</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: 16, cursor: 'pointer' }}>
            ✕
          </button>
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--muted)', marginBottom: 12 }}>{project.title}</div>

        {!canEdit && (
          <div style={{ fontSize: 11, color: 'var(--muted)', background: 'var(--bg)', borderRadius: 8, padding: '6px 10px', marginBottom: 12 }}>
            Chỉ nhân sự được giao việc này hoặc Cấp lãnh đạo mới có thể tick cập nhật.
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {items.map((item) => (
            <div
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 6px',
                borderRadius: 8
              }}
            >
              <button
                onClick={() => toggle(item)}
                style={{
                  width: 19,
                  height: 19,
                  flexShrink: 0,
                  borderRadius: 5,
                  border: '1.5px solid ' + (item.checked ? 'var(--accent)' : 'var(--border)'),
                  background: item.checked ? 'var(--accent)' : 'transparent',
                  cursor: canEdit ? 'pointer' : 'default',
                  padding: 0
                }}
                aria-label={item.label}
              >
                {item.checked && <span style={{ color: 'var(--accent-contrast)', fontSize: 12 }}>✓</span>}
              </button>
              <span
                style={{
                  flexGrow: 1,
                  fontSize: 13.5,
                  textDecoration: item.checked ? 'line-through' : 'none'
                }}
              >
                {item.label}
              </span>
              {canEdit && (
                <button
                  onClick={() => deleteItem(item)}
                  aria-label="Xoá đầu việc này"
                  style={{ border: 'none', background: 'transparent', color: '#C63C3C', cursor: 'pointer', fontSize: 12 }}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

        {canEdit && (
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {presentGroups.map((group) => {
              const baseLabel = INCREMENTABLE_GROUPS[group];
              const nextLabel = computeNextLabel(items, group, baseLabel);
              return (
                <button
                  key={group}
                  onClick={() => addNext(group, baseLabel)}
                  style={{ textAlign: 'left', border: 'none', background: 'transparent', fontSize: 12.5, fontWeight: 600, color: 'var(--muted)', cursor: 'pointer', padding: '6px 0' }}
                >
                  + Thêm &quot;{nextLabel}&quot;
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
