'use client';

import { useState } from 'react';
import { createClient } from '../../lib/supabase/client';
import type { Project, Staff, Department } from '../../lib/types';
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

export default function ProjectPipelineModal({
  projects,
  allStaff,
  departments,
  me,
  onClose,
  onSaved
}: {
  projects: Project[];
  allStaff: Staff[];
  departments: Department[];
  me: Staff;
  onClose: () => void;
  onSaved: () => void;
}) {
  const supabase = createClient();

  const [projectQuery, setProjectQuery] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [title, setTitle] = useState('');
  const [groupName, setGroupName] = useState('');
  const [mktLeadId, setMktLeadId] = useState('');
  const [ttthLeadId, setTtthLeadId] = useState('');
  const [sangTaoLeadId, setSangTaoLeadId] = useState('');
  const [dungPhimLeadId, setDungPhimLeadId] = useState('');
  const [briefLink, setBriefLink] = useState('');
  const [kichBanLink, setKichBanLink] = useState('');
  const [tvcLink, setTvcLink] = useState('');
  const [deadlineDate, setDeadlineDate] = useState('');
  const [deadlineHour, setDeadlineHour] = useState('09');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const mktStaff = allStaff.filter((s) => s.department?.name === 'Ban Marketing');
  const ttthStaff = allStaff.filter((s) => s.department?.name === 'Ban TTTH');
  const stStaff = allStaff.filter((s) => s.department?.name === 'Ban Sáng tạo');
  const dungStaff = allStaff.filter((s) => s.department?.name === 'Team Dựng phim');

  const suggestions = projectQuery.trim()
    ? projects.filter((p) => p.title.toLowerCase().includes(projectQuery.trim().toLowerCase())).slice(0, 8)
    : [];

  const isExisting = !!selectedProjectId;

  function pickProject(p: Project) {
    setSelectedProjectId(p.id);
    setProjectQuery(p.title);
    setShowSuggestions(false);
    setTitle(p.title);
    setGroupName(p.group_name ?? '');
    setMktLeadId(p.mkt_lead_id ?? '');
    setTtthLeadId(p.ttth_lead_id ?? '');
    setSangTaoLeadId(p.sang_tao_lead_id ?? '');
    setDungPhimLeadId(p.dung_phim_lead_id ?? '');
    setBriefLink(p.brief_link ?? '');
    setKichBanLink(p.kich_ban_link ?? '');
    setTvcLink(p.tvc_link ?? '');
    const { date, hour } = splitDeadline(p.deadline);
    setDeadlineDate(date);
    setDeadlineHour(hour);
  }

  function resetToNew(query: string) {
    setSelectedProjectId('');
    setProjectQuery(query);
    setTitle(query);
    setGroupName('');
    setMktLeadId('');
    setTtthLeadId('');
    setSangTaoLeadId('');
    setDungPhimLeadId('');
    setBriefLink('');
    setKichBanLink('');
    setTvcLink('');
    setDeadlineDate('');
    setDeadlineHour('09');
  }

  const canSave = title.trim() && groupName.trim() && !saving;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setError('');

    const deadlineIso = deadlineDate ? new Date(`${deadlineDate}T${deadlineHour}:00:00`).toISOString() : null;

    const payload = {
      title: title.trim(),
      group_name: groupName.trim(),
      mkt_lead_id: mktLeadId || null,
      ttth_lead_id: ttthLeadId || null,
      sang_tao_lead_id: sangTaoLeadId || null,
      dung_phim_lead_id: dungPhimLeadId || null,
      brief_link: briefLink.trim() || null,
      kich_ban_link: kichBanLink.trim() || null,
      tvc_link: tvcLink.trim() || null,
      deadline: deadlineIso
    };

    let projectId = selectedProjectId;

    if (isExisting) {
      const { error: updateErr } = await supabase.from('projects').update(payload).eq('id', projectId);
      if (updateErr) {
        setError('Không cập nhật được dự án: ' + updateErr.message);
        setSaving(false);
        return;
      }
    } else {
      const { data: newProject, error: insertErr } = await supabase
        .from('projects')
        .insert({ ...payload, created_by: me.id })
        .select()
        .single();
      if (insertErr || !newProject) {
        setError('Không tạo được dự án: ' + (insertErr?.message || 'Lỗi không xác định, vui lòng thử lại.'));
        setSaving(false);
        return;
      }
      projectId = newProject.id;
    }

    // Dashboard chỉ liệt kê dự án theo ĐẦU VIỆC (bảng tasks) hoặc BRIEF — dự án không có
    // đầu việc/brief nào sẽ ẩn hoàn toàn khỏi Dashboard dù đã lưu thành công. Modal này chỉ
    // ghi vào bảng projects nên phải tự tạo kèm 1 đầu việc mặc định để dự án hiện ra ngay.
    if (projectId) {
      const [{ data: existingTasks, error: taskCheckErr }, { data: existingBriefs, error: briefCheckErr }] = await Promise.all([
        supabase.from('tasks').select('id').eq('project_id', projectId).limit(1),
        supabase.from('briefs').select('id').eq('project_id', projectId).limit(1)
      ]);

      if (taskCheckErr || briefCheckErr) {
        setError(
          'Dự án đã được lưu, nhưng không kiểm tra được đầu việc nên có thể dự án sẽ chưa hiện ở Dashboard. Vui lòng mở lại dự án này để kiểm tra, hoặc báo lại cho quản trị viên.'
        );
        setSaving(false);
        return;
      }

      if ((!existingTasks || existingTasks.length === 0) && (!existingBriefs || existingBriefs.length === 0)) {
        const { data: newTask, error: taskErr } = await supabase
          .from('tasks')
          .insert({
            project_id: projectId,
            task_name: title.trim(),
            mkt_assignee_id: mktLeadId || null,
            ttth_assignee_id: ttthLeadId || null,
            st_assignee_id: sangTaoLeadId || null,
            dung_assignee_id: dungPhimLeadId || null,
            brief_link: briefLink.trim() || null,
            kich_ban_link: kichBanLink.trim() || null,
            tvc_link: tvcLink.trim() || null,
            deadline: deadlineIso,
            created_by: me.id
          })
          .select()
          .single();

        if (taskErr || !newTask) {
          setError(
            'Dự án đã được lưu, nhưng KHÔNG tạo được đầu việc mặc định nên sẽ chưa hiện ở Dashboard. Vui lòng mở lại dự án "' +
              title.trim() +
              '" để thêm đầu việc, hoặc báo lại cho quản trị viên. Lỗi: ' +
              (taskErr?.message || 'không xác định')
          );
          setSaving(false);
          return;
        }

        if (newTask) {
          const seed: { task_id: string; label: string; item_group: string; checked: boolean; sort_order: number }[] = [];
          let sortOrder = 0;
          if (sangTaoLeadId) {
            seed.push({ task_id: newTask.id, label: 'Đang triển khai', item_group: 'start', checked: false, sort_order: sortOrder++ });
            seed.push({ task_id: newTask.id, label: 'Duyệt kịch bản v1', item_group: 'script', checked: false, sort_order: sortOrder++ });
            seed.push({ task_id: newTask.id, label: 'Check bản dựng TVC v1', item_group: 'build', checked: false, sort_order: sortOrder++ });
          }
          if (dungPhimLeadId) {
            seed.push({ task_id: newTask.id, label: 'Dựng v1', item_group: 'dung', checked: false, sort_order: sortOrder++ });
            seed.push({ task_id: newTask.id, label: 'Dựng v2', item_group: 'dung', checked: false, sort_order: sortOrder++ });
          }
          if (sangTaoLeadId || dungPhimLeadId) {
            seed.push({ task_id: newTask.id, label: 'Hoàn thành', item_group: 'end', checked: false, sort_order: sortOrder++ });
          }
          if (seed.length > 0) {
            await supabase.from('checklist_items').insert(seed);
          }
        }
      }
    }

    setSaving(false);
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
          width: 460,
          maxWidth: '92vw',
          maxHeight: '88vh',
          overflowY: 'auto',
          background: 'var(--surface)',
          borderRadius: 20,
          padding: 24,
          zIndex: 141
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
            {isExisting ? '✏️ Cập nhật dự án đã có' : '➕ Thêm dự án mới'}
          </h3>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: 16, cursor: 'pointer' }}>
            ✕
          </button>
        </div>

        {isExisting && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              background: '#FFF4D6',
              border: '1px solid #E8C468',
              borderRadius: 10,
              padding: '10px 12px',
              marginBottom: 14,
              fontSize: 12
            }}
          >
            <span style={{ color: '#6B5200', lineHeight: 1.4 }}>
              Dự án <strong>&quot;{title}&quot;</strong> đã có sẵn trong hệ thống. Bấm <strong>Cập nhật dự án</strong> bên dưới sẽ SỬA
              dự án này, không tạo dự án mới.
            </span>
            <button
              type="button"
              onClick={() => resetToNew(projectQuery)}
              style={{
                flexShrink: 0,
                border: '1px solid #E8C468',
                background: '#FFFFFF',
                color: '#6B5200',
                borderRadius: 8,
                padding: '6px 10px',
                fontSize: 11.5,
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              Tạo dự án mới thay vào đó
            </button>
          </div>
        )}

        {error && (
          <div
            style={{
              background: '#FDECEC',
              border: '1px solid #F3B4B4',
              borderRadius: 10,
              padding: '10px 12px',
              marginBottom: 14,
              fontSize: 12,
              color: '#C63C3C',
              lineHeight: 1.4
            }}
          >
            {error}
          </div>
        )}

        <label style={{ ...labelStyle, position: 'relative' }}>
          Tên dự án
          <input
            value={projectQuery}
            onChange={(e) => {
              const v = e.target.value;
              const match = projects.find((p) => p.title.toLowerCase() === v.trim().toLowerCase());
              if (!match) resetToNew(v);
              else {
                setProjectQuery(v);
                setTitle(v);
              }
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            placeholder="Gõ tên dự án đã có hoặc nhập tên dự án mới..."
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
                zIndex: 142
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
          {!isExisting && projectQuery.trim() && (
            <span style={{ fontSize: 10.5, color: '#2E7D32', fontWeight: 400 }}>Sẽ tạo dự án mới với tên này</span>
          )}
        </label>

        <label style={labelStyle}>
          Thuộc nhóm
          <select
            value={GROUP_OPTIONS.includes(groupName) ? groupName : ''}
            onChange={(e) => setGroupName(e.target.value)}
            style={inputStyle}
          >
            <option value="">— Chọn nhóm —</option>
            {GROUP_OPTIONS.map((g) => (
              <option key={g} value={g}>
                {g.replace('BĐS ', '')}
              </option>
            ))}
          </select>
        </label>

        <label style={labelStyle}>
          Nhân sự Ban MKT
          <select value={mktLeadId} onChange={(e) => setMktLeadId(e.target.value)} style={inputStyle}>
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
          <select value={ttthLeadId} onChange={(e) => setTtthLeadId(e.target.value)} style={inputStyle}>
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
          <select value={sangTaoLeadId} onChange={(e) => setSangTaoLeadId(e.target.value)} style={inputStyle}>
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
          <select value={dungPhimLeadId} onChange={(e) => setDungPhimLeadId(e.target.value)} style={inputStyle}>
            <option value="">— Chưa chọn —</option>
            {dungStaff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>

        <label style={labelStyle}>
          Link Brief
          <input
            value={briefLink}
            onChange={(e) => setBriefLink(e.target.value)}
            placeholder="https://..."
            style={inputStyle}
          />
        </label>

        <label style={labelStyle}>
          Link Kịch bản
          <input
            value={kichBanLink}
            onChange={(e) => setKichBanLink(e.target.value)}
            placeholder="https://..."
            style={inputStyle}
          />
        </label>

        <label style={labelStyle}>
          Link TVC
          <input
            value={tvcLink}
            onChange={(e) => setTvcLink(e.target.value)}
            placeholder="https://..."
            style={inputStyle}
          />
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
            {saving ? 'Đang lưu...' : isExisting ? 'Cập nhật dự án' : 'Lưu dự án mới'}
          </button>
        </div>
      </div>
    </div>
  );
}
