'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '../../lib/supabase/client';
import type { Staff } from '../../lib/types';

// Tab GHI CHÚ — mỗi team một bảng ghi chú riêng.
// Quyền nằm ở database (RLS bảng team_notes): chỉ đọc được ghi chú của chính team mình,
// kể cả Admin / Cấp lãnh đạo cũng không xem được team khác. Chỉ người đăng được sửa / xoá.

interface TeamNote {
  id: string;
  content: string;
  created_at: string;
  updated_at: string | null;
  created_by: string;
  author?: { id: string; name: string } | null;
}

// Màu giấy ghi chú pastel, cố định theo id để mỗi tờ giữ nguyên màu.
const PAPER = [
  { bg: '#FFF4C2', bgDark: '#4A4224' },
  { bg: '#FDE2E4', bgDark: '#4A2C30' },
  { bg: '#E2F0CB', bgDark: '#33402A' },
  { bg: '#DCEBFA', bgDark: '#26384A' },
  { bg: '#EBDDF7', bgDark: '#3A2E48' }
];
function paperFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return PAPER[h % PAPER.length];
}

// "14:05 · 10/10/2026" theo giờ Việt Nam
function formatStamp(iso: string) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hour12: false,
    day: '2-digit', month: '2-digit', year: 'numeric'
  }).formatToParts(new Date(iso));
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${g('hour')}:${g('minute')} · ${g('day')}/${g('month')}/${g('year')}`;
}

function PenIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

function NoteEditor({
  title,
  initial,
  saving,
  error,
  onCancel,
  onSave
}: {
  title: string;
  initial: string;
  saving: boolean;
  error: string;
  onCancel: () => void;
  onSave: (text: string) => void;
}) {
  const [text, setText] = useState(initial);
  const trimmed = text.trim();
  return (
    <div>
      <div onClick={saving ? undefined : onCancel} style={{ position: 'fixed', inset: 0, background: 'rgba(20,20,19,0.45)', zIndex: 140 }} />
      <div
        style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          width: 480, maxWidth: '92vw', maxHeight: '86vh', overflowY: 'auto',
          background: 'var(--surface)', borderRadius: 20, padding: 24, zIndex: 141
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{title}</h3>
          <button onClick={onCancel} disabled={saving} aria-label="Đóng" style={{ border: 'none', background: 'transparent', fontSize: 16, cursor: 'pointer', color: 'var(--text)' }}>
            ✕
          </button>
        </div>
        <textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={5000}
          placeholder="Gõ nội dung ghi chú..."
          style={{
            width: '100%', minHeight: 200, padding: 12, borderRadius: 12, border: '1px solid var(--border)',
            fontSize: 14.5, lineHeight: 1.55, fontFamily: 'inherit', resize: 'vertical',
            background: 'var(--surface)', color: 'var(--text)', boxSizing: 'border-box'
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, fontSize: 11.5, color: 'var(--muted)' }}>
          <span>{error && <span style={{ color: '#C63C3C' }}>{error}</span>}</span>
          <span>{text.length}/5000</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
          <button
            onClick={onCancel}
            disabled={saving}
            style={{ height: 42, padding: '0 18px', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            Huỷ
          </button>
          <button
            onClick={() => onSave(trimmed)}
            disabled={!trimmed || saving}
            style={{
              height: 42, padding: '0 22px', borderRadius: 10, border: 'none', background: 'var(--accent)', color: 'var(--accent-contrast)',
              fontSize: 14, fontWeight: 700, cursor: !trimmed || saving ? 'default' : 'pointer', opacity: !trimmed || saving ? 0.55 : 1
            }}
          >
            {saving ? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NotesTab({ me }: { me: Staff | null }) {
  const supabase = createClient();
  const [notes, setNotes] = useState<TeamNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [editor, setEditor] = useState<{ mode: 'new' } | { mode: 'edit'; note: TeamNote } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<TeamNote | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const check = () => {
      const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim().toLowerCase();
      // nền tối khi màu --bg có độ sáng thấp
      const m = bg.match(/^#([0-9a-f]{6})$/);
      if (!m) return setIsDark(false);
      const n = parseInt(m[1], 16);
      const lum = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
      setIsDark(lum < 100);
    };
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'class', 'data-theme'] });
    return () => obs.disconnect();
  }, []);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('team_notes')
      .select('id, content, created_at, updated_at, created_by, author:staff!team_notes_created_by_fkey(id, name)')
      .order('created_at', { ascending: false });
    if (error) {
      setLoadError('Không tải được ghi chú. Vui lòng thử lại.');
    } else {
      setLoadError('');
      setNotes((data as unknown as TeamNote[]) ?? []);
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save(text: string) {
    if (!editor || !text) return;
    setSaving(true);
    setSaveError('');
    const res =
      editor.mode === 'new'
        ? await supabase.from('team_notes').insert({ content: text })
        : await supabase.from('team_notes').update({ content: text }).eq('id', editor.note.id);
    setSaving(false);
    if (res.error) {
      setSaveError('Không lưu được ghi chú. Vui lòng thử lại.');
      return;
    }
    setEditor(null);
    load();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    await supabase.from('team_notes').delete().eq('id', deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
    load();
  }

  const teamName = me?.department?.name ?? 'team của bạn';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: 24, fontWeight: 600, margin: '0 0 4px' }}>Ghi chú</h1>
          <p style={{ fontSize: 13.5, color: 'var(--muted)', margin: 0 }}>
            Bảng ghi chú riêng của <strong style={{ color: 'var(--text)' }}>{teamName}</strong> — chỉ thành viên trong team xem được.
          </p>
        </div>
        <button
          onClick={() => {
            setSaveError('');
            setEditor({ mode: 'new' });
          }}
          aria-label="Thêm ghi chú"
          title="Thêm ghi chú"
          style={{
            width: 44, height: 44, flexShrink: 0, borderRadius: 12, border: 'none', background: 'var(--accent)',
            color: 'var(--accent-contrast)', fontSize: 24, fontWeight: 600, lineHeight: 1, cursor: 'pointer'
          }}
        >
          +
        </button>
      </div>

      {loading ? (
        <div style={{ fontSize: 13.5, color: 'var(--muted)' }}>Đang tải...</div>
      ) : loadError ? (
        <div style={{ fontSize: 13.5, color: '#C63C3C' }}>{loadError}</div>
      ) : notes.length === 0 ? (
        <div
          style={{
            border: '1px dashed var(--border)', borderRadius: 16, padding: '40px 20px', textAlign: 'center',
            color: 'var(--muted)', fontSize: 14
          }}
        >
          Chưa có ghi chú nào. Bấm <strong style={{ color: 'var(--text)' }}>+</strong> để ghim ghi chú đầu tiên cho team.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 16, alignItems: 'start' }}>
          {notes.map((n) => {
            const paper = paperFor(n.id);
            const mine = !!me && n.created_by === me.id;
            return (
              <div
                key={n.id}
                style={{
                  position: 'relative', background: isDark ? paper.bgDark : paper.bg, borderRadius: 14,
                  padding: '16px 16px 12px', boxShadow: '0 2px 6px rgba(20,20,19,0.08)', display: 'flex', flexDirection: 'column', gap: 12
                }}
              >
                <span aria-hidden style={{ position: 'absolute', top: -7, left: '50%', marginLeft: -7, fontSize: 15 }}>📌</span>
                <div style={{ fontSize: 14.5, lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'var(--text)' }}>
                  {n.content}
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8, borderTop: '1px solid rgba(20,20,19,0.08)', paddingTop: 10 }}>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.45, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: 'var(--text)' }}>{n.author?.name ?? '—'}</div>
                    <div>{formatStamp(n.created_at)}</div>
                    {n.updated_at && <div style={{ fontStyle: 'italic' }}>Đã sửa {formatStamp(n.updated_at)}</div>}
                  </div>
                  {mine && (
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <button
                        onClick={() => {
                          setSaveError('');
                          setEditor({ mode: 'edit', note: n });
                        }}
                        aria-label="Sửa ghi chú"
                        title="Sửa"
                        style={{ width: 34, height: 34, borderRadius: 9, border: 'none', background: 'rgba(255,255,255,0.55)', color: '#C2760B', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <PenIcon />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(n)}
                        aria-label="Xoá ghi chú"
                        title="Xoá"
                        style={{ width: 34, height: 34, borderRadius: 9, border: 'none', background: 'rgba(255,255,255,0.55)', color: '#C63C3C', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editor && (
        <NoteEditor
          title={editor.mode === 'new' ? 'Ghi chú mới' : 'Sửa ghi chú'}
          initial={editor.mode === 'edit' ? editor.note.content : ''}
          saving={saving}
          error={saveError}
          onCancel={() => setEditor(null)}
          onSave={save}
        />
      )}

      {deleteTarget && (
        <div>
          <div onClick={deleting ? undefined : () => setDeleteTarget(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(20,20,19,0.45)', zIndex: 140 }} />
          <div
            style={{
              position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 360, maxWidth: '92vw',
              background: 'var(--surface)', borderRadius: 20, padding: 24, zIndex: 141
            }}
          >
            <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700 }}>Xoá ghi chú này?</h3>
            <p style={{ margin: '0 0 18px', fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.5 }}>
              Ghi chú sẽ bị xoá khỏi bảng của cả team và không khôi phục được.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                style={{ height: 42, padding: '0 18px', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
              >
                Huỷ
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                style={{ height: 42, padding: '0 18px', borderRadius: 10, border: 'none', background: '#C63C3C', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: deleting ? 0.6 : 1 }}
              >
                {deleting ? 'Đang xoá...' : 'Xoá'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
