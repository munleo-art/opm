'use client';

import { useRef, useState } from 'react';
import { createClient } from '../../lib/supabase/client';
import type { Task, Brief, Staff, ChecklistItem } from '../../lib/types';
import { canEditTaskChecklist, canManageBriefs } from '../../lib/permissions';
import { computeNextLabel } from '../../lib/checklist';

const INCREMENTABLE_GROUPS: Record<string, string> = {
  script: 'Duyệt kịch bản',
  build: 'Check bản dựng TVC',
  dung: 'Dựng'
};

// "2026-10-05" -> "05/10/2026" — hiển thị kiểu ngày/tháng/năm quen thuộc thay vì ISO.
function formatVNDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function TaskChecklistBlock({
  task,
  me,
  onRefetch,
  assigneeName,
  groups,
  addableGroups,
  customAddGroup
}: {
  task: Task;
  me: Staff | null;
  onRefetch: () => void;
  assigneeName?: string | null;
  // Chỉ hiển thị các checklist item thuộc các nhóm này (vd Dựng phim chỉ xem nhóm 'dung'/'end',
  // Sáng tạo chỉ xem nhóm 'script'/'build'/'end') — tránh 1 task gán nhiều vai trò bị lẫn checklist.
  groups?: string[];
  // Các nhóm luôn hiện nút "+ Thêm..." kể cả khi task CHƯA có item nào của nhóm đó
  // (mặc định trước đây chỉ hiện nút khi đã có sẵn item, khiến nhóm rỗng không thể khởi tạo).
  // Dùng cho DỰNG PHIM — vẫn giữ kiểu tự tăng "Dựng v3", "v4"...
  addableGroups?: string[];
  // Nếu có, thay toàn bộ nút "+ Thêm ..." tự tăng bằng 1 ô nhập tự do — item mới sẽ được
  // thêm vào nhóm này. Dùng cho SÁNG TẠO để nhân sự tự gõ việc cụ thể, không giới hạn label cố định.
  customAddGroup?: string;
}) {
  const supabase = createClient();
  const allItems = (task.checklist_items ?? []).slice().sort((a, b) => a.sort_order - b.sort_order);
  const items = groups ? allItems.filter((i) => groups.includes(i.item_group)) : allItems;
  const canEdit = canEditTaskChecklist(me, task);
  const [customDraft, setCustomDraft] = useState('');

  // Đổi tên đầu việc (icon bút chì).
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');

  // Deadline dự kiến riêng cho từng đầu việc (icon lịch) — chọn bằng lịch popup có sẵn của
  // trình duyệt (không gõ tay), và khi đã chọn thì hiện luôn thành 1 nút ngày ngay cạnh đầu việc
  // để dễ theo dõi (không ẩn đi). Bấm lại vào nút đó để mở lịch đổi ngày khác.
  const dateInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Kéo-thả đổi thứ tự (icon 3 gạch ngang). "Hoàn thành"/"Hoàn thiện" (item_group 'end') luôn
  // bị loại khỏi danh sách có thể kéo và luôn được ghép lại ở cuối cùng sau khi lưu thứ tự mới.
  const [dragItemId, setDragItemId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

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

  function startEdit(item: ChecklistItem) {
    setEditingId(item.id);
    setEditDraft(item.label);
  }

  async function saveEdit() {
    if (!editingId) return;
    const label = editDraft.trim();
    const id = editingId;
    setEditingId(null);
    if (!label) return;
    await supabase.from('checklist_items').update({ label }).eq('id', id);
    onRefetch();
  }

  function openDatePicker(itemId: string) {
    const el = dateInputRefs.current[itemId];
    if (!el) return;
    if (typeof (el as HTMLInputElement & { showPicker?: () => void }).showPicker === 'function') {
      (el as HTMLInputElement & { showPicker: () => void }).showPicker();
    } else {
      el.focus();
    }
  }

  async function onDeadlineChange(item: ChecklistItem, value: string) {
    await supabase.from('checklist_items').update({ deadline: value || null }).eq('id', item.id);
    onRefetch();
  }

  async function persistOrder(reordered: ChecklistItem[]) {
    const endItems = items.filter((i) => i.item_group === 'end');
    const finalOrder = [...reordered, ...endItems];
    await Promise.all(
      finalOrder.map((it, idx) => supabase.from('checklist_items').update({ sort_order: idx }).eq('id', it.id))
    );
    onRefetch();
  }

  function handleDrop(targetId: string) {
    const draggedId = dragItemId;
    setDragItemId(null);
    setDragOverId(null);
    if (!draggedId || draggedId === targetId) return;
    const reorderable = items.filter((i) => i.item_group !== 'end');
    const fromIdx = reorderable.findIndex((i) => i.id === draggedId);
    const toIdx = reorderable.findIndex((i) => i.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const next = reorderable.slice();
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    persistOrder(next);
  }

  async function addNext(group: string, baseLabel: string) {
    if (!canEdit) return;
    const label = computeNextLabel(items, group, baseLabel);
    const maxSort = allItems.reduce((mx, i) => Math.max(mx, i.sort_order), -1);
    await supabase.from('checklist_items').insert({
      task_id: task.id,
      label,
      item_group: group,
      checked: false,
      sort_order: maxSort + 1
    });
    onRefetch();
  }

  async function addCustom() {
    if (!canEdit || !customAddGroup) return;
    const label = customDraft.trim();
    if (!label) return;
    const maxSort = allItems.reduce((mx, i) => Math.max(mx, i.sort_order), -1);
    await supabase.from('checklist_items').insert({
      task_id: task.id,
      label,
      item_group: customAddGroup,
      checked: false,
      sort_order: maxSort + 1
    });
    setCustomDraft('');
    onRefetch();
  }

  const groupsToOffer = (
    addableGroups ?? Array.from(new Set(items.map((i) => i.item_group)))
  ).filter((g) => g in INCREMENTABLE_GROUPS);

  return (
    <div>
      <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>{assigneeName ?? task.assignee?.name}</div>
      {task.task_name && <div style={{ fontSize: 11.5, color: 'var(--muted)', marginBottom: 8 }}>{task.task_name}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 8 }}>
        {items.map((item) => {
          const reorderable = canEdit && item.item_group !== 'end';
          const isEditing = editingId === item.id;
          const isDragOver = dragOverId === item.id && dragItemId !== item.id;
          return (
            <div key={item.id}>
              <div
                onDragOver={(e) => {
                  if (!reorderable || !dragItemId) return;
                  e.preventDefault();
                  if (dragOverId !== item.id) setDragOverId(item.id);
                }}
                onDrop={(e) => {
                  if (!reorderable) return;
                  e.preventDefault();
                  handleDrop(item.id);
                }}
                onDragLeave={() => {
                  if (dragOverId === item.id) setDragOverId(null);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 4px',
                  borderRadius: 6,
                  borderTop: isDragOver ? '2px solid var(--accent)' : '2px solid transparent'
                }}
              >
                {reorderable ? (
                  <span
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = 'move';
                      setDragItemId(item.id);
                    }}
                    onDragEnd={() => {
                      setDragItemId(null);
                      setDragOverId(null);
                    }}
                    aria-label="Kéo để đổi thứ tự"
                    title="Kéo để đổi thứ tự"
                    style={{ flexShrink: 0, fontSize: 12, color: 'var(--muted-2)', cursor: 'grab', lineHeight: 1 }}
                  >
                    ≡
                  </span>
                ) : (
                  <span style={{ width: 12, flexShrink: 0 }} />
                )}
                <button
                  onClick={() => toggle(item)}
                  style={{
                    width: 18,
                    height: 18,
                    flexShrink: 0,
                    borderRadius: 5,
                    border: '1.5px solid ' + (item.checked ? 'var(--accent)' : 'var(--border)'),
                    background: item.checked ? 'var(--accent)' : 'transparent',
                    cursor: canEdit ? 'pointer' : 'default',
                    padding: 0
                  }}
                  aria-label={item.label}
                >
                  {item.checked && <span style={{ color: 'var(--accent-contrast)', fontSize: 11 }}>✓</span>}
                </button>
                {isEditing ? (
                  <input
                    autoFocus
                    value={editDraft}
                    onChange={(e) => setEditDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); saveEdit(); }
                      if (e.key === 'Escape') { e.preventDefault(); setEditingId(null); }
                    }}
                    style={{ flexGrow: 1, fontSize: 13, height: 26, padding: '0 6px', borderRadius: 6, border: '1px solid var(--border)' }}
                  />
                ) : (
                  <span style={{ flexGrow: 1, fontSize: 13, textDecoration: item.checked ? 'line-through' : 'none' }}>
                    {item.label}
                  </span>
                )}

                {isEditing ? (
                  <>
                    <button
                      onClick={saveEdit}
                      aria-label="Lưu tên đầu việc"
                      style={{ border: 'none', background: 'transparent', color: '#2E7D32', cursor: 'pointer', fontSize: 13 }}
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      aria-label="Huỷ đổi tên"
                      style={{ border: 'none', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: 12 }}
                    >
                      ✕
                    </button>
                  </>
                ) : (
                  canEdit && item.item_group !== 'end' && (
                    <>
                      <span style={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
                        {item.deadline ? (
                          <button
                            onClick={() => openDatePicker(item.id)}
                            aria-label="Đổi deadline dự kiến"
                            title="Bấm để đổi deadline"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              border: '1px solid var(--border)',
                              background: 'var(--chip)',
                              color: 'var(--text)',
                              borderRadius: 999,
                              padding: '2px 8px 2px 6px',
                              fontSize: 11,
                              fontWeight: 600,
                              cursor: 'pointer',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            📅 {formatVNDate(item.deadline)}
                          </button>
                        ) : (
                          <button
                            onClick={() => openDatePicker(item.id)}
                            aria-label="Đặt deadline dự kiến"
                            title="Đặt deadline dự kiến"
                            style={{ border: 'none', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: 12.5 }}
                          >
                            📅
                          </button>
                        )}
                        <input
                          ref={(el) => {
                            dateInputRefs.current[item.id] = el;
                          }}
                          type="date"
                          value={item.deadline ?? ''}
                          onChange={(e) => onDeadlineChange(item, e.target.value)}
                          tabIndex={-1}
                          style={{
                            position: 'absolute',
                            inset: 0,
                            width: '100%',
                            height: '100%',
                            opacity: 0,
                            border: 'none',
                            padding: 0,
                            pointerEvents: 'none'
                          }}
                        />
                      </span>
                      <button
                        onClick={() => startEdit(item)}
                        aria-label="Sửa tên đầu việc"
                        style={{ border: 'none', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: 12.5 }}
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => deleteItem(item)}
                        aria-label="Xoá đầu việc này"
                        style={{ border: 'none', background: 'transparent', color: '#C63C3C', cursor: 'pointer', fontSize: 12 }}
                      >
                        ✕
                      </button>
                    </>
                  )
                )}
              </div>
            </div>
          );
        })}
        {items.length === 0 && <div style={{ fontSize: 12, color: 'var(--muted-2)' }}>Chưa có checklist.</div>}
      </div>

      {canEdit && customAddGroup && (
        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
          <input
            value={customDraft}
            onChange={(e) => setCustomDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addCustom();
              }
            }}
            placeholder="Nhập việc cần thêm..."
            style={{ flex: 1, height: 32, padding: '0 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 12.5 }}
          />
          <button
            onClick={addCustom}
            style={{
              height: 32,
              padding: '0 14px',
              borderRadius: 8,
              border: 'none',
              background: 'var(--accent)',
              color: 'var(--accent-contrast)',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            +
          </button>
        </div>
      )}

      {canEdit &&
        !customAddGroup &&
        groupsToOffer.map((group) => {
          const baseLabel = INCREMENTABLE_GROUPS[group];
          const nextLabel = computeNextLabel(items, group, baseLabel);
          return (
            <button
              key={group}
              onClick={() => addNext(group, baseLabel)}
              style={{
                display: 'block',
                textAlign: 'left',
                border: 'none',
                background: 'transparent',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--muted)',
                cursor: 'pointer',
                padding: '4px 0'
              }}
            >
              + Thêm &quot;{nextLabel}&quot;
            </button>
          );
        })}
    </div>
  );
}

type TaskLinkField = 'brief_link' | 'kich_ban_link' | 'tvc_link' | 'ttth_link';

function TaskLinkRow({
  task,
  me,
  onRefetch,
  field,
  label,
  placeholder
}: {
  task: Task;
  me: Staff | null;
  onRefetch: () => void;
  field: TaskLinkField;
  label: string;
  placeholder: string;
}) {
  const supabase = createClient();
  const canEdit = canEditTaskChecklist(me, task);
  const [editing, setEditing] = useState(false);
  const currentValue =
    (field === 'brief_link'
      ? task.brief_link
      : field === 'kich_ban_link'
      ? task.kich_ban_link
      : field === 'ttth_link'
      ? task.ttth_link
      : task.tvc_link) ?? '';
  const [draft, setDraft] = useState(currentValue);

  async function save() {
    const value = draft.trim() || null;
    const payload =
      field === 'brief_link'
        ? { brief_link: value }
        : field === 'kich_ban_link'
        ? { kich_ban_link: value }
        : field === 'ttth_link'
        ? { ttth_link: value }
        : { tvc_link: value };
    await supabase.from('tasks').update(payload).eq('id', task.id);
    setEditing(false);
    onRefetch();
  }

  if (editing) {
    return (
      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          style={{ flex: 1, height: 34, padding: '0 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 12.5 }}
        />
        <button
          onClick={save}
          style={{ height: 34, padding: '0 12px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: 'var(--accent-contrast)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
        >
          Lưu
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 12.5 }}>
      <span style={{ color: 'var(--muted)' }}>{label}:</span>
      {currentValue ? (
        <a href={currentValue} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600 }}>
          Xem link ↗️
        </a>
      ) : (
        <span style={{ color: 'var(--muted-2)' }}>Chưa có</span>
      )}
      {canEdit && (
        <button
          onClick={() => setEditing(true)}
          style={{ border: 'none', background: 'transparent', color: 'var(--muted)', fontSize: 11.5, cursor: 'pointer', textDecoration: 'underline' }}
        >
          {currentValue ? 'Sửa' : '+ Thêm link'}
        </button>
      )}
    </div>
  );
}

function BriefLinkRow({ brief, me, onRefetch }: { brief: Brief; me: Staff | null; onRefetch: () => void }) {
  const supabase = createClient();
  const canEdit = canManageBriefs(me);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(brief.link_url ?? '');

  async function save() {
    await supabase.from('briefs').update({ link_url: draft || null }).eq('id', brief.id);
    setEditing(false);
    onRefetch();
  }

  if (!canEdit) return null;

  if (editing) {
    return (
      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Dán link brief..."
          style={{ flex: 1, height: 34, padding: '0 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 12.5 }}
        />
        <button
          onClick={save}
          style={{ height: 34, padding: '0 12px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: 'var(--accent-contrast)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
        >
          Lưu
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      style={{ display: 'block', border: 'none', background: 'transparent', color: 'var(--muted)', fontSize: 11.5, cursor: 'pointer', textDecoration: 'underline', padding: 0, marginTop: 6 }}
    >
      {brief.link_url ? 'Sửa link brief' : '+ Thêm link'}
    </button>
  );
}

type FinalLinkField = 'final_drive_link' | 'final_youtube_link';

// 3 dòng tách riêng ở cuối bảng chi tiết đầu việc: 2 link bản FINAL (Drive/YouTube) và checkbox
// "HOÀN THÀNH CÔNG VIỆC". Không thuộc riêng ban nào — ghi trực tiếp vào brief (nếu đầu việc có
// brief) hoặc vào backingTask (nếu đầu việc chỉ là 1 task không kèm brief), dùng đúng entity mà
// Dashboard đang đọc completed/final_drive_link/final_youtube_link để tô màu + sắp xếp.
function CompletionSection({
  brief,
  backingTask,
  me,
  onRefetch
}: {
  brief: Brief | null;
  backingTask: Task | null;
  me: Staff | null;
  onRefetch: () => void;
}) {
  const supabase = createClient();
  const current: Brief | Task | null = brief ?? backingTask;
  const canEdit = brief ? canManageBriefs(me) : backingTask ? canEditTaskChecklist(me, backingTask) : false;
  const [editingField, setEditingField] = useState<FinalLinkField | null>(null);
  const [draft, setDraft] = useState('');

  if (!current) return null;

  async function saveLink(field: FinalLinkField, value: string) {
    const payload = { [field]: value.trim() || null };
    if (brief) {
      await supabase.from('briefs').update(payload).eq('id', brief.id);
    } else if (backingTask) {
      await supabase.from('tasks').update(payload).eq('id', backingTask.id);
    }
    setEditingField(null);
    onRefetch();
  }

  async function toggleCompleted() {
    if (!canEdit || !current) return;
    const payload = { completed: !current.completed };
    if (brief) {
      await supabase.from('briefs').update(payload).eq('id', brief.id);
    } else if (backingTask) {
      await supabase.from('tasks').update(payload).eq('id', backingTask.id);
    }
    onRefetch();
  }

  function renderLinkRow(label: string, field: FinalLinkField, placeholder: string) {
    const value = field === 'final_drive_link' ? current!.final_drive_link : current!.final_youtube_link;
    const isEditing = editingField === field;

    if (isEditing) {
      return (
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholder}
            style={{ flex: 1, height: 34, padding: '0 10px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 12.5 }}
          />
          <button
            onClick={() => saveLink(field, draft)}
            style={{ height: 34, padding: '0 12px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: 'var(--accent-contrast)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
          >
            Lưu
          </button>
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 12.5 }}>
        <span style={{ color: 'var(--muted)' }}>{label}:</span>
        {value ? (
          <a href={value} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600 }}>
            Xem link ↗️
          </a>
        ) : (
          <span style={{ color: 'var(--muted-2)' }}>Chưa có</span>
        )}
        {canEdit && (
          <button
            onClick={() => {
              setDraft(value ?? '');
              setEditingField(field);
            }}
            style={{ border: 'none', background: 'transparent', color: 'var(--muted)', fontSize: 11.5, cursor: 'pointer', textDecoration: 'underline' }}
          >
            {value ? 'Sửa' : '+ Thêm link'}
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px dashed var(--border)' }}>
      {renderLinkRow('Link FINAL DRIVE', 'final_drive_link', 'Dán link Drive bản final...')}
      {renderLinkRow('Link FINAL YOUTUBE', 'final_youtube_link', 'Dán link YouTube bản final...')}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
        <button
          onClick={toggleCompleted}
          disabled={!canEdit}
          style={{
            width: 20,
            height: 20,
            flexShrink: 0,
            borderRadius: 6,
            border: '1.5px solid ' + (current.completed ? '#2E7D32' : 'var(--border)'),
            background: current.completed ? '#2E7D32' : 'transparent',
            cursor: canEdit ? 'pointer' : 'default',
            padding: 0
          }}
          aria-label="Hoàn thành công việc"
        >
          {current.completed && <span style={{ color: '#fff', fontSize: 12 }}>✓</span>}
        </button>
        <span style={{ fontSize: 13, fontWeight: 700, color: current.completed ? '#2E7D32' : 'var(--text)' }}>
          HOÀN THÀNH CÔNG VIỆC
        </span>
      </div>
    </div>
  );
}

export default function WorkItemDetailModal({
  headline,
  brief,
  primaryTask,
  backingTask,
  ttthTask,
  stTasks,
  dungTasks,
  me,
  onClose,
  onRefetch
}: {
  headline: string;
  brief: Brief | null;
  primaryTask: Task | null;
  backingTask: Task | null;
  ttthTask: Task | null;
  stTasks: Task[];
  dungTasks: Task[];
  me: Staff | null;
  onClose: () => void;
  onRefetch: () => void;
}) {
  return (
    <div>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(20,20,19,0.45)', zIndex: 140 }} />
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%,-50%)',
          width: 460,
          maxWidth: '92vw',
          maxHeight: '84vh',
          overflowY: 'auto',
          background: 'var(--surface)',
          borderRadius: 20,
          padding: 24,
          zIndex: 141
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{headline}</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: 16, cursor: 'pointer' }}>
            ✕
          </button>
        </div>

        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 8, letterSpacing: 0.4 }}>
          BRIEF (MKT)
        </div>
        <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 12, marginBottom: 20, fontSize: 12.5 }}>
          {brief ? (
            <>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{brief.title}</div>
              {brief.link_url ? (
                <a href={brief.link_url} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600, fontSize: 12 }}>
                  Xem link brief ↗️
                </a>
              ) : (
                <span style={{ color: 'var(--muted-2)' }}>Chưa có link brief.</span>
              )}
              <div style={{ color: 'var(--muted)', fontSize: 11.5, marginTop: 4 }}>Đăng bởi: {brief.poster?.name ?? '—'}</div>
              <BriefLinkRow brief={brief} me={me} onRefetch={onRefetch} />
            </>
          ) : primaryTask ? (
            <TaskLinkRow
              task={primaryTask}
              me={me}
              onRefetch={onRefetch}
              field="brief_link"
              label="Link brief"
              placeholder="Dán link brief..."
            />
          ) : (
            <span style={{ color: 'var(--muted-2)' }}>Chưa có brief cho việc này.</span>
          )}
        </div>

        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 8, letterSpacing: 0.4 }}>
          TTTH
        </div>
        <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 12, marginBottom: 20, fontSize: 12.5 }}>
          {ttthTask ? (
            <>
              <div style={{ color: 'var(--muted)', fontSize: 11.5, marginBottom: 4 }}>
                Nhân sự: {ttthTask.ttth_assignee?.name ?? '—'}
              </div>
              <TaskLinkRow
                task={ttthTask}
                me={me}
                onRefetch={onRefetch}
                field="ttth_link"
                label="Link brief"
                placeholder="Dán link brief TTTH..."
              />
            </>
          ) : (
            <span style={{ color: 'var(--muted-2)' }}>Chưa có nhân sự TTTH cho đầu việc này.</span>
          )}
        </div>

        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 8, letterSpacing: 0.4 }}>
          SÁNG TẠO
        </div>
        <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 12, marginBottom: 20 }}>
          {stTasks.length > 0 ? (
            stTasks.map((t) => (
              <div key={t.id} style={{ marginBottom: 12 }}>
                <TaskChecklistBlock
                  task={t}
                  me={me}
                  onRefetch={onRefetch}
                  assigneeName={t.st_assignee?.name ?? t.assignee?.name}
                  groups={['start', 'script', 'build', 'end']}
                  customAddGroup="script"
                />
                <TaskLinkRow
                  task={t}
                  me={me}
                  onRefetch={onRefetch}
                  field="kich_ban_link"
                  label="Link kịch bản"
                  placeholder="Dán link kịch bản..."
                />
              </div>
            ))
          ) : (
            <span style={{ fontSize: 12.5, color: 'var(--muted-2)' }}>Chưa có việc Sáng tạo cho đầu việc này.</span>
          )}
        </div>

        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 8, letterSpacing: 0.4 }}>
          DỰNG PHIM
        </div>
        <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 12 }}>
          {dungTasks.length > 0 ? (
            dungTasks.map((t) => (
              <div key={t.id} style={{ marginBottom: 12 }}>
                <TaskChecklistBlock
                  task={t}
                  me={me}
                  onRefetch={onRefetch}
                  assigneeName={t.dung_assignee?.name ?? t.assignee?.name}
                  groups={['dung', 'end']}
                  addableGroups={['dung']}
                />
                <TaskLinkRow
                  task={t}
                  me={me}
                  onRefetch={onRefetch}
                  field="tvc_link"
                  label="Link TVC"
                  placeholder="Dán link TVC..."
                />
              </div>
            ))
          ) : primaryTask ? (
            <>
              <span style={{ fontSize: 12.5, color: 'var(--muted-2)' }}>Chưa có việc Dựng phim cho đầu việc này.</span>
              <TaskLinkRow
                task={primaryTask}
                me={me}
                onRefetch={onRefetch}
                field="tvc_link"
                label="Link TVC"
                placeholder="Dán link TVC..."
              />
            </>
          ) : (
            <span style={{ fontSize: 12.5, color: 'var(--muted-2)' }}>Chưa có việc Dựng phim cho đầu việc này.</span>
          )}
        </div>

        <CompletionSection brief={brief} backingTask={backingTask} me={me} onRefetch={onRefetch} />
      </div>
    </div>
  );
}
