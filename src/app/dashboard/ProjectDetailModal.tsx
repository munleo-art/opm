'use client';

import { useState } from 'react';
import { createClient } from '../../lib/supabase/client';
import type { Project, Task, Staff } from '../../lib/types';
import { canAddProject, canManageAnyTask, canEditTaskChecklist, visibleStaff } from '../../lib/permissions';
import DatePicker from './DatePicker';

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const GROUP_OPTIONS = ['BĐS Miền Bắc', 'BĐS Miền Trung', 'BĐS Miền Nam', 'SSG', 'SCG', 'KLB'];

function splitDeadline(d: string | null): { date: string; hour: string } {
  if (!d) return { date: '', hour: '09' };
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return { date: `${y}-${m}-${day}`, hour: String(dt.getHours()).padStart(2, '0') };
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

function TaskLinksPopup({
  task,
  me,
  onClose,
  onRefetch
}: {
  task: Task;
  me: Staff | null;
  onClose: () => void;
  onRefetch: () => void;
}) {
  const supabase = createClient();
  const canEdit = canEditTaskChecklist(me, task);
  const [editing, setEditing] = useState(false);
  const [briefLink, setBriefLink] = useState(task.brief_link ?? '');
  const [kichBanLink, setKichBanLink] = useState(task.kich_ban_link ?? '');
  const [tvcLink, setTvcLink] = useState(task.tvc_link ?? '');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await supabase
      .from('tasks')
      .update({
        brief_link: briefLink.trim() || null,
        kich_ban_link: kichBanLink.trim() || null,
        tvc_link: tvcLink.trim() || null
      })
      .eq('id', task.id);
    setSaving(false);
    setEditing(false);
    onRefetch();
  }

  const rows: [string, string, (v: string) => void][] = [
    ['Link brief', briefLink, setBriefLink],
    ['Link kịch bản', kichBanLink, setKichBanLink],
    ['Link TVC', tvcLink, setTvcLink]
  ];

  return (
    <div>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(20,20,19,0.45)', zIndex: 150 }} />
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%,-50%)',
          width: 400,
          maxWidth: '92vw',
          maxHeight: '86vh',
          overflowY: 'auto',
          background: 'var(--surface)',
          borderRadius: 20,
          padding: 24,
          zIndex: 151
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{task.task_name || 'Đầu việc'}</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: 16, cursor: 'pointer' }}>
            ✕
          </button>
        </div>

        {rows.map(([label, value, setter]) => (
          <div key={label} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11.5, color: 'var(--muted)', marginBottom: 4, fontWeight: 600 }}>{label}</div>
            {editing ? (
              <input
                value={value}
                onChange={(e) => setter(e.target.value)}
                placeholder="Dán link..."
                style={{
                  width: '100%',
                  height: 38,
                  padding: '0 10px',
                  borderRadius: 9,
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  color: 'var(--text)',
                  fontSize: 12.5,
                  boxSizing: 'border-box'
                }}
              />
            ) : value ? (
              <a href={value} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12.5, fontWeight: 600 }}>
                Xem link ↗️
              </a>
            ) : (
              <span style={{ fontSize: 12, color: 'var(--muted-2)' }}>Chưa có</span>
            )}
          </div>
        ))}

        {canEdit && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
            <button
              onClick={() => (editing ? save() : setEditing(true))}
              disabled={saving}
              style={{
                height: 38,
                padding: '0 18px',
                borderRadius: 9,
                border: 'none',
                background: 'var(--accent)',
                color: 'var(--accent-contrast)',
                fontSize: 12.5,
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {saving ? 'Đang lưu...' : editing ? 'Lưu' : 'Chỉnh sửa'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function TaskEditModal({
  project,
  task,
  allStaff,
  me,
  onClose,
  onSaved,
  onDeleted
}: {
  project: Project;
  task: Task | null;
  allStaff: Staff[];
  me: Staff;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const supabase = createClient();
  const isEdit = !!task;

  const mktStaff = visibleStaff(allStaff, me).filter((s) => s.department?.name === 'Ban Marketing');
  const ttthStaff = visibleStaff(allStaff, me).filter((s) => s.department?.name === 'Ban TTTH');
  const stStaff = visibleStaff(allStaff, me).filter((s) => s.department?.name === 'Ban Sáng tạo');
  const dungStaff = visibleStaff(allStaff, me).filter((s) => s.department?.name === 'Team Dựng phim');

  const [taskName, setTaskName] = useState(task?.task_name ?? '');
  const [mktId, setMktId] = useState(task?.mkt_assignee_id ?? '');
  const [ttthId, setTtthId] = useState(task?.ttth_assignee_id ?? '');
  const [stId, setStId] = useState(task?.st_assignee_id ?? '');
  const [dungId, setDungId] = useState(task?.dung_assignee_id ?? '');
  const init = splitDeadline(task?.deadline ?? null);
  const [deadlineDate, setDeadlineDate] = useState(init.date);
  const [deadlineHour, setDeadlineHour] = useState(init.hour);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const canSave = taskName.trim().length > 0 && !saving;

  // Seed checklist mặc định theo vai trò vừa gán, chỉ thêm nhóm nào CHƯA có sẵn item
  // (tránh tạo trùng khi task đã có checklist từ trước, vd tạo qua luồng cũ).
  function buildChecklistSeed(taskId: string, existingGroups: Set<string>, sortBase: number) {
    const seed: { task_id: string; label: string; item_group: string; checked: boolean; sort_order: number }[] = [];
    let sortOrder = sortBase;
    if (stId && !existingGroups.has('script')) {
      seed.push({ task_id: taskId, label: 'Đang triển khai', item_group: 'start', checked: false, sort_order: sortOrder++ });
      seed.push({ task_id: taskId, label: 'Duyệt kịch bản v1', item_group: 'script', checked: false, sort_order: sortOrder++ });
      seed.push({ task_id: taskId, label: 'Check bản dựng TVC v1', item_group: 'build', checked: false, sort_order: sortOrder++ });
    }
    if (dungId && !existingGroups.has('dung')) {
      seed.push({ task_id: taskId, label: 'Dựng v1', item_group: 'dung', checked: false, sort_order: sortOrder++ });
      seed.push({ task_id: taskId, label: 'Dựng v2', item_group: 'dung', checked: false, sort_order: sortOrder++ });
    }
    if ((stId || dungId) && !existingGroups.has('end')) {
      seed.push({ task_id: taskId, label: 'Hoàn thành', item_group: 'end', checked: false, sort_order: sortOrder++ });
    }
    return seed;
  }

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    const deadlineIso = deadlineDate ? new Date(`${deadlineDate}T${deadlineHour}:00:00`).toISOString() : null;
    const payload = {
      task_name: taskName.trim(),
      mkt_assignee_id: mktId || null,
      ttth_assignee_id: ttthId || null,
      st_assignee_id: stId || null,
      dung_assignee_id: dungId || null,
      deadline: deadlineIso
    };
    if (isEdit && task) {
      await supabase.from('tasks').update(payload).eq('id', task.id);
      const existingGroups = new Set((task.checklist_items ?? []).map((i) => i.item_group));
      const sortBase = (task.checklist_items ?? []).reduce((mx, i) => Math.max(mx, i.sort_order), -1) + 1;
      const seed = buildChecklistSeed(task.id, existingGroups, sortBase);
      if (seed.length > 0) {
        await supabase.from('checklist_items').insert(seed);
      }
    } else {
      const { data: newTask } = await supabase
        .from('tasks')
        .insert({ ...payload, project_id: project.id, created_by: me.id })
        .select()
        .single();
      if (newTask) {
        const seed = buildChecklistSeed(newTask.id, new Set(), 0);
        if (seed.length > 0) {
          await supabase.from('checklist_items').insert(seed);
        }
      }
    }
    setSaving(false);
    onSaved();
  }

  async function handleDelete() {
    if (!task) return;
    await supabase.from('tasks').delete().eq('id', task.id);
    onDeleted();
  }

  return (
    <div>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(20,20,19,0.45)', zIndex: 150 }} />
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
          borderRadius: 20,
          padding: 24,
          zIndex: 151
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{isEdit ? 'Sửa đầu việc' : 'Thêm đầu việc'}</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: 16, cursor: 'pointer' }}>
            ✕
          </button>
        </div>

        <label style={labelStyle}>
          Tên đầu việc
          <input
            value={taskName}
            onChange={(e) => setTaskName(e.target.value)}
            placeholder="Nhập tên đầu việc..."
            style={inputStyle}
          />
        </label>

        <label style={labelStyle}>
          Nhân sự MKT
          <select value={mktId} onChange={(e) => setMktId(e.target.value)} style={inputStyle}>
            <option value="">— Chưa chọn —</option>
            {mktStaff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>

        <label style={labelStyle}>
          Nhân sự Ban TTTH
          <select value={ttthId} onChange={(e) => setTtthId(e.target.value)} style={inputStyle}>
            <option value="">— Chưa chọn —</option>
            {ttthStaff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>

        <label style={labelStyle}>
          Nhân sự Ban ST
          <select value={stId} onChange={(e) => setStId(e.target.value)} style={inputStyle}>
            <option value="">— Chưa chọn —</option>
            {stStaff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>

        <label style={labelStyle}>
          Nhân sự Dựng
          <select value={dungId} onChange={(e) => setDungId(e.target.value)} style={inputStyle}>
            <option value="">— Chưa chọn —</option>
            {dungStaff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>

        <label style={{ ...labelStyle, marginBottom: 18 }}>
          Deadline
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1.4 }}>
              <DatePicker value={deadlineDate} onChange={setDeadlineDate} />
            </div>
            <select
              value={deadlineHour}
              onChange={(e) => setDeadlineHour(e.target.value)}
              style={{ ...inputStyle, flex: 1 }}
            >
              {HOURS.map((h) => (
                <option key={h} value={h}>
                  {h}:00
                </option>
              ))}
            </select>
          </div>
        </label>

        <div style={{ display: 'flex', gap: 10 }}>
          {isEdit &&
            (confirmingDelete ? (
              <button
                onClick={handleDelete}
                style={{
                  flex: 1,
                  height: 42,
                  borderRadius: 9,
                  border: 'none',
                  background: '#C63C3C',
                  color: '#fff',
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Chắc chắn muốn xoá?
              </button>
            ) : (
              <button
                onClick={() => setConfirmingDelete(true)}
                aria-label="Xoá đầu việc"
                style={{
                  height: 42,
                  width: 42,
                  borderRadius: 9,
                  border: '1px solid var(--border)',
                  background: 'transparent',
                  color: '#C63C3C',
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            ))}
          <button
            onClick={handleSave}
            disabled={!canSave}
            style={{
              flex: 1,
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
            {saving ? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>
      </div>
    </div>
  );
}

const TASK_COLS = '1.4fr 0.9fr 0.9fr 0.9fr 0.9fr 0.9fr 0.4fr';

export default function ProjectDetailModal({
  project,
  me,
  allStaff,
  tasks,
  onClose,
  onRefetch
}: {
  project: Project;
  me: Staff | null;
  allStaff: Staff[];
  tasks: Task[];
  onClose: () => void;
  onRefetch: () => void;
}) {
  const supabase = createClient();

  const [projectEditMode, setProjectEditMode] = useState(false);
  const [titleDraft, setTitleDraft] = useState(project.title);
  const [groupDraft, setGroupDraft] = useState(project.group_name);
  const [savingProject, setSavingProject] = useState(false);

  const [linksTaskId, setLinksTaskId] = useState<string | null>(null);
  const [editTaskId, setEditTaskId] = useState<string | null>(null);
  const [addTaskOpen, setAddTaskOpen] = useState(false);

  async function saveProjectInfo() {
    if (!titleDraft.trim() || !groupDraft.trim()) return;
    setSavingProject(true);
    await supabase
      .from('projects')
      .update({ title: titleDraft.trim(), group_name: groupDraft.trim() })
      .eq('id', project.id);
    setSavingProject(false);
    setProjectEditMode(false);
    onRefetch();
  }

  const linksTask = tasks.find((t) => t.id === linksTaskId) ?? null;
  const editTask = tasks.find((t) => t.id === editTaskId) ?? null;

  return (
    <div>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(20,20,19,0.45)', zIndex: 100 }} />
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%,-50%)',
          width: 680,
          maxWidth: '92vw',
          maxHeight: '86vh',
          overflowY: 'auto',
          background: 'var(--surface)',
          borderRadius: 20,
          padding: 26,
          zIndex: 101
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          {projectEditMode ? (
            <input
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              style={{
                margin: 0,
                fontSize: 19,
                fontWeight: 700,
                flex: 1,
                marginRight: 12,
                padding: '4px 8px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text)'
              }}
            />
          ) : (
            <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700 }}>{project.title}</h2>
          )}
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: 18, cursor: 'pointer' }}>
            ✕
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          {projectEditMode ? (
            <select
              value={GROUP_OPTIONS.includes(groupDraft) ? groupDraft : ''}
              onChange={(e) => setGroupDraft(e.target.value)}
              style={{
                fontSize: 12,
                padding: '4px 8px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text)',
                flex: 1
              }}
            >
              <option value="">— Chọn nhóm —</option>
              {GROUP_OPTIONS.map((g) => (
                <option key={g} value={g}>
                  {g.replace('BĐS ', '')}
                </option>
              ))}
            </select>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{project.group_name}</div>
          )}
          {canAddProject(me) && (
            <button
              onClick={() => {
                if (projectEditMode) {
                  saveProjectInfo();
                } else {
                  setTitleDraft(project.title);
                  setGroupDraft(project.group_name);
                  setProjectEditMode(true);
                }
              }}
              disabled={savingProject}
              style={{
                height: 26,
                padding: '0 10px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: projectEditMode ? 'var(--accent)' : 'transparent',
                color: projectEditMode ? 'var(--accent-contrast)' : 'var(--text)',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {savingProject ? 'Đang lưu...' : projectEditMode ? 'Lưu' : 'Chỉnh sửa'}
            </button>
          )}
        </div>

        <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--muted)', marginBottom: 8 }}>
          DANH SÁCH CÔNG VIỆC
        </div>
        <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', marginBottom: 14 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: TASK_COLS,
              gap: 8,
              padding: '8px 14px',
              borderBottom: '1px solid var(--border)',
              fontSize: 10.5,
              fontWeight: 700,
              color: 'var(--muted)'
            }}
          >
            <div>TÊN ĐẦU VIỆC</div>
            <div>MKT</div>
            <div>TTTH</div>
            <div>BAN ST</div>
            <div>DỰNG</div>
            <div>DEADLINE</div>
            <div />
          </div>

          {tasks.length === 0 && (
            <div style={{ padding: 14, fontSize: 12.5, color: 'var(--muted)' }}>Chưa có đầu việc nào.</div>
          )}

          {tasks.map((t) => (
            <div
              key={t.id}
              style={{
                display: 'grid',
                gridTemplateColumns: TASK_COLS,
                gap: 8,
                alignItems: 'center',
                padding: '10px 14px',
                borderBottom: '1px solid var(--border)',
                fontSize: 12.5
              }}
            >
              <button
                onClick={() => setLinksTaskId(t.id)}
                style={{
                  textAlign: 'left',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  fontSize: 'inherit',
                  fontFamily: 'inherit',
                  textDecoration: 'underline',
                  cursor: 'pointer'
                }}
              >
                {t.task_name || '(chưa đặt tên)'}
              </button>
              <div style={{ color: 'var(--muted)' }}>{t.mkt_assignee?.name ?? '—'}</div>
              <div style={{ color: 'var(--muted)' }}>{t.ttth_assignee?.name ?? '—'}</div>
              <div style={{ color: 'var(--muted)' }}>{t.st_assignee?.name ?? '—'}</div>
              <div style={{ color: 'var(--muted)' }}>{t.dung_assignee?.name ?? '—'}</div>
              <div style={{ color: 'var(--muted)', fontSize: 11.5 }}>
                {t.deadline ? new Date(t.deadline).toLocaleDateString('vi-VN') : '—'}
              </div>
              <div style={{ textAlign: 'right' }}>
                {canManageAnyTask(me) && (
                  <button
                    onClick={() => setEditTaskId(t.id)}
                    aria-label="Sửa đầu việc"
                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 14 }}
                  >
                    ✏️
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {canManageAnyTask(me) && (
          <div style={{ marginBottom: 6 }}>
            <button
              onClick={() => setAddTaskOpen(true)}
              style={{
                height: 38,
                padding: '0 14px',
                borderRadius: 10,
                border: '1px dashed var(--border)',
                background: 'transparent',
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              + Thêm đầu việc
            </button>
          </div>
        )}
      </div>

      {linksTask && (
        <TaskLinksPopup task={linksTask} me={me} onClose={() => setLinksTaskId(null)} onRefetch={onRefetch} />
      )}

      {editTask && me && (
        <TaskEditModal
          project={project}
          task={editTask}
          allStaff={allStaff}
          me={me}
          onClose={() => setEditTaskId(null)}
          onSaved={() => {
            setEditTaskId(null);
            onRefetch();
          }}
          onDeleted={() => {
            setEditTaskId(null);
            onRefetch();
          }}
        />
      )}

      {addTaskOpen && me && (
        <TaskEditModal
          project={project}
          task={null}
          allStaff={allStaff}
          me={me}
          onClose={() => setAddTaskOpen(false)}
          onSaved={() => {
            setAddTaskOpen(false);
            onRefetch();
          }}
          onDeleted={() => setAddTaskOpen(false)}
        />
      )}
    </div>
  );
}
