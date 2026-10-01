'use client';

import { useState } from 'react';
import { createClient } from '../../lib/supabase/client';
import type { Project, Staff, Department } from '../../lib/types';
import DatePicker from './DatePicker';

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const GROUP_OPTIONS = ['BĐS Miền Bắc', 'BĐS Miền Trung', 'BĐS Miền Nam', 'SSG', 'SCG', 'KLB'];

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

  // "Tên dự án" chỉ dùng để XÁC ĐỊNH dự án (chọn 1 dự án có sẵn, hoặc đặt tên cho dự án mới) —
  // không còn liên quan gì tới nội dung công việc đang thêm, nên gõ/đổi ô này KHÔNG được phép
  // xoá những gì đã nhập ở các ô công việc bên dưới.
  const [projectQuery, setProjectQuery] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [title, setTitle] = useState('');
  const [groupName, setGroupName] = useState('');

  // Toàn bộ phần dưới đây mô tả ĐẦU VIỆC (công việc) đang được thêm — luôn ghi vào bảng tasks,
  // không bao giờ ghi/đè lên bảng projects nữa.
  const [taskName, setTaskName] = useState('');
  const [mktId, setMktId] = useState('');
  const [ttthId, setTtthId] = useState('');
  const [stId, setStId] = useState('');
  const [dungId, setDungId] = useState('');
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

  // Chọn 1 dự án có sẵn — dù bấm vào gợi ý hay gõ trùng khớp hẳn tên — luôn đi theo 1 đường
  // duy nhất này, để không còn kiểu gõ xong không bấm gợi ý thì lại thành "tạo dự án mới trùng
  // tên" như trước nữa.
  function selectExisting(p: Project) {
    setSelectedProjectId(p.id);
    setProjectQuery(p.title);
    setTitle(p.title);
    setGroupName(p.group_name ?? '');
    setShowSuggestions(false);
  }

  function clearProjectSelection(query: string) {
    setSelectedProjectId('');
    setProjectQuery(query);
    setTitle(query);
    setGroupName('');
  }

  const canSave = title.trim() && taskName.trim() && (isExisting || groupName.trim()) && !saving;

  // Seed checklist mặc định theo vai trò vừa gán cho đầu việc này.
  function buildChecklistSeed(taskId: string) {
    const seed: { task_id: string; label: string; item_group: string; checked: boolean; sort_order: number }[] = [];
    let sortOrder = 0;
    if (stId) {
      seed.push({ task_id: taskId, label: 'Đang triển khai', item_group: 'start', checked: false, sort_order: sortOrder++ });
      seed.push({ task_id: taskId, label: 'Duyệt kịch bản v1', item_group: 'script', checked: false, sort_order: sortOrder++ });
      seed.push({ task_id: taskId, label: 'Check bản dựng TVC v1', item_group: 'build', checked: false, sort_order: sortOrder++ });
    }
    if (dungId) {
      seed.push({ task_id: taskId, label: 'Dựng v1', item_group: 'dung', checked: false, sort_order: sortOrder++ });
      seed.push({ task_id: taskId, label: 'Dựng v2', item_group: 'dung', checked: false, sort_order: sortOrder++ });
    }
    if (stId || dungId) {
      seed.push({ task_id: taskId, label: 'Hoàn thành', item_group: 'end', checked: false, sort_order: sortOrder++ });
    }
    return seed;
  }

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setError('');

    const deadlineIso = deadlineDate ? new Date(`${deadlineDate}T${deadlineHour}:00:00`).toISOString() : null;

    let projectId = selectedProjectId;
    let createdProjectTitle = '';

    // Dự án MỚI hoàn toàn → tạo thêm vào danh sách dự án (chỉ tên + nhóm, không còn phụ
    // trách/link/deadline ở cấp dự án — những thứ đó giờ thuộc về từng đầu việc).
    if (!isExisting) {
      const { data: newProject, error: insertProjectErr } = await supabase
        .from('projects')
        .insert({ title: title.trim(), group_name: groupName.trim(), created_by: me.id })
        .select()
        .single();
      if (insertProjectErr || !newProject) {
        setError('Không tạo được dự án: ' + (insertProjectErr?.message || 'Lỗi không xác định, vui lòng thử lại.'));
        setSaving(false);
        return;
      }
      projectId = newProject.id;
      createdProjectTitle = title.trim();
    }

    // Dự án ĐÃ CÓ → không đụng vào bảng projects, chỉ thêm đúng 1 đầu việc mới vào dự án đó.
    const { data: newTask, error: taskErr } = await supabase
      .from('tasks')
      .insert({
        project_id: projectId,
        task_name: taskName.trim(),
        mkt_assignee_id: mktId || null,
        ttth_assignee_id: ttthId || null,
        st_assignee_id: stId || null,
        dung_assignee_id: dungId || null,
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
        (createdProjectTitle ? `Đã tạo dự án mới "${createdProjectTitle}", nhưng ` : '') +
          'không tạo được công việc: ' +
          (taskErr?.message || 'Lỗi không xác định, vui lòng thử lại.')
      );
      setSaving(false);
      return;
    }

    const seed = buildChecklistSeed(newTask.id);
    if (seed.length > 0) {
      await supabase.from('checklist_items').insert(seed);
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
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>➕ Thêm công việc mới</h3>
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
              background: 'rgba(46,125,50,0.1)',
              border: '1px solid rgba(46,125,50,0.35)',
              borderRadius: 10,
              padding: '10px 12px',
              marginBottom: 14,
              fontSize: 12
            }}
          >
            <span style={{ color: '#2E7D32', lineHeight: 1.4 }}>
              Dự án <strong>&quot;{title}&quot;</strong> đã có sẵn — công việc bên dưới sẽ được thêm vào dự án này, không tạo
              dự án mới.
            </span>
            <button
              type="button"
              onClick={() => clearProjectSelection(projectQuery)}
              style={{
                flexShrink: 0,
                border: '1px solid var(--border)',
                background: '#FFFFFF',
                color: 'var(--text)',
                borderRadius: 8,
                padding: '6px 10px',
                fontSize: 11.5,
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              Không phải dự án này
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
          Dự án
          <input
            value={projectQuery}
            onChange={(e) => {
              const v = e.target.value;
              const match = projects.find((p) => p.title.toLowerCase() === v.trim().toLowerCase());
              if (match) selectExisting(match);
              else {
                setSelectedProjectId('');
                setProjectQuery(v);
                setTitle(v);
                setGroupName('');
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
                  onClick={() => selectExisting(p)}
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
            <span style={{ fontSize: 10.5, color: '#2E7D32', fontWeight: 400 }}>Chưa có trong danh sách — sẽ tạo dự án mới với tên này</span>
          )}
        </label>

        <label style={labelStyle}>
          Thuộc nhóm
          {isExisting ? (
            <div style={{ ...inputStyle, display: 'flex', alignItems: 'center', color: 'var(--muted)', background: 'var(--chip)' }}>
              {groupName || '—'}
            </div>
          ) : (
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
          )}
        </label>

        <div style={{ height: 1, background: 'var(--border)', margin: '4px 0 16px' }} />

        <label style={labelStyle}>
          Tên công việc
          <input
            value={taskName}
            onChange={(e) => setTaskName(e.target.value)}
            placeholder="VD: TVC đợt 2, Banner Tết, Bài đăng Fanpage..."
            style={inputStyle}
          />
        </label>

        <label style={labelStyle}>
          Nhân sự Ban MKT
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
            {saving ? 'Đang lưu...' : isExisting ? 'Thêm công việc vào dự án' : 'Tạo dự án + thêm công việc'}
          </button>
        </div>
      </div>
    </div>
  );
}
