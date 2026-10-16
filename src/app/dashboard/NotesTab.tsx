'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '../../lib/supabase/client';
import type { Staff } from '../../lib/types';
import { MAX_NOTE_LENGTH, editorHtmlToStored, noteDisplayHtml, noteToHtml, sanitizeNoteHtml } from '../../lib/noteRichText';

// Tab GHI CHÚ — mỗi team một bảng ghi chú riêng.
// Quyền nằm ở database (RLS bảng team_notes): chỉ đọc được ghi chú của chính team mình,
// kể cả Admin / Cấp lãnh đạo cũng không xem được team khác. Ai trong team cũng sửa / xoá được.

interface TeamNote {
  id: string;
  title: string | null;
  content: string;
  color: string | null;
  created_at: string;
  updated_at: string | null;
  created_by: string;
  author?: { id: string; name: string } | null;
  editor?: { id: string; name: string } | null;
}

type ColorKey = 'pastel' | 'teal' | 'red' | 'purple' | 'yellow' | 'green' | 'blue' | 'pink' | 'white' | 'black';

// Màu giữ tông nhẹ để chữ luôn dễ đọc; riêng "Đen" dùng chữ trắng.
// Chữ trên giấy ghi chú luôn đặt cứng theo màu giấy (không theo chế độ sáng/tối) để không bị chìm.
const COLORS: { key: ColorKey; label: string; bg: string; fg: string; sub: string }[] = [
  { key: 'pastel', label: 'Pastel', bg: '', fg: '#2B2420', sub: 'rgba(43,36,32,0.62)' },
  { key: 'teal', label: 'Xanh', bg: '#CDEFEA', fg: '#17312E', sub: 'rgba(23,49,46,0.62)' },
  { key: 'red', label: 'Đỏ', bg: '#F8C9C4', fg: '#3D1713', sub: 'rgba(61,23,19,0.62)' },
  { key: 'purple', label: 'Tím', bg: '#DCCDF5', fg: '#2A1D45', sub: 'rgba(42,29,69,0.62)' },
  { key: 'yellow', label: 'Vàng', bg: '#FCEB9F', fg: '#3A3010', sub: 'rgba(58,48,16,0.62)' },
  { key: 'green', label: 'Xanh lục', bg: '#CDEBC2', fg: '#1C3416', sub: 'rgba(28,52,22,0.62)' },
  { key: 'blue', label: 'Xanh dương', bg: '#C9DDF7', fg: '#14263F', sub: 'rgba(20,38,63,0.62)' },
  { key: 'pink', label: 'Hồng', bg: '#F9D3E6', fg: '#43182D', sub: 'rgba(67,24,45,0.62)' },
  { key: 'white', label: 'Trắng', bg: '#FFFFFF', fg: '#1F1F1E', sub: 'rgba(31,31,30,0.58)' },
  { key: 'black', label: 'Đen', bg: '#1F1F1E', fg: '#F4F2EE', sub: 'rgba(244,242,238,0.66)' }
];

// "Pastel" = mỗi tờ tự lấy 1 tông pastel nhẹ cố định theo id.
const PASTEL_SET = ['#FFF4C2', '#FDE2E4', '#E2F0CB', '#DCEBFA', '#EBDDF7'];
function paletteFor(note: { id: string; color: string | null }) {
  const c = COLORS.find((x) => x.key === note.color) ?? COLORS[0];
  if (c.key !== 'pastel') return c;
  let h = 0;
  for (let i = 0; i < note.id.length; i++) h = (h * 31 + note.id.charCodeAt(i)) >>> 0;
  return { ...c, bg: PASTEL_SET[h % PASTEL_SET.length] };
}
const swatchBg = (k: ColorKey) => (k === 'pastel' ? 'conic-gradient(#FFF4C2, #FDE2E4, #E2F0CB, #DCEBFA, #EBDDF7, #FFF4C2)' : COLORS.find((c) => c.key === k)!.bg);

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

const sheetStyle: React.CSSProperties = {
  position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
  width: 520, maxWidth: '92vw', maxHeight: '86vh', overflowY: 'auto',
  background: 'var(--surface)', borderRadius: 20, padding: 24, zIndex: 141
};
const backdrop: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(20,20,19,0.45)', zIndex: 140 };

function ColorPicker({ value, onChange }: { value: ColorKey; onChange: (k: ColorKey) => void }) {
  return (
    <div>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--muted)', marginBottom: 8, letterSpacing: 0.3 }}>
        MÀU GHI CHÚ · <span style={{ color: 'var(--text)' }}>{COLORS.find((c) => c.key === value)?.label}</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {COLORS.map((c) => {
          const active = c.key === value;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => onChange(c.key)}
              aria-label={c.label}
              title={c.label}
              style={{
                width: 34, height: 34, borderRadius: '50%', cursor: 'pointer', padding: 0,
                background: swatchBg(c.key),
                border: active ? '3px solid var(--text)' : '1px solid var(--border)',
                boxShadow: active ? '0 0 0 2px var(--surface) inset' : 'none'
              }}
            />
          );
        })}
      </div>
    </div>
  );
}


type FormatCmd = 'bold' | 'italic' | 'underline' | 'strikeThrough' | 'insertOrderedList' | 'insertUnorderedList';
const FORMAT_BUTTONS: { cmd: FormatCmd; label: React.ReactNode; title: string }[] = [
  { cmd: 'bold', label: <b>B</b>, title: 'In đậm (Ctrl+B)' },
  { cmd: 'italic', label: <i style={{ fontFamily: 'Georgia, serif' }}>I</i>, title: 'In nghiêng (Ctrl+I)' },
  { cmd: 'underline', label: <u>U</u>, title: 'Gạch chân (Ctrl+U)' },
  { cmd: 'strikeThrough', label: <s>S</s>, title: 'Gạch ngang chữ' },
  { cmd: 'insertOrderedList', label: '1.', title: 'Danh sách số (hoặc gõ "1. " đầu dòng)' },
  { cmd: 'insertUnorderedList', label: '•', title: 'Gạch đầu dòng (hoặc gõ "- " đầu dòng)' }
];

// CSS dùng chung cho nội dung ghi chú (ô soạn + hiển thị)
const RICH_CSS = `
.note-rich { word-break: break-word; }
.note-rich ul, .note-rich ol { margin: 4px 0; padding-left: 22px; }
.note-rich li { margin: 2px 0; }
.note-rich a { color: inherit; text-decoration: underline; text-underline-offset: 2px; font-weight: 600; word-break: break-all; }
.note-rich div { min-height: 1em; }
.note-editor:empty::before { content: attr(data-placeholder); color: var(--muted); pointer-events: none; }
`;

function RichEditor({ initialHtml, onChange }: { initialHtml: string; onChange: (html: string, text: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (ref.current) {
      ref.current.innerHTML = initialHtml;
      onChange(ref.current.innerHTML, ref.current.innerText);
    }
    // Khi xuống dòng tạo thẻ <div> (nhất quán giữa các trình duyệt)
    try { document.execCommand('defaultParagraphSeparator', false, 'div'); } catch { /* bỏ qua */ }
    const onSel = () => {
      const sel = document.getSelection();
      if (!sel || !ref.current || !sel.anchorNode || !ref.current.contains(sel.anchorNode)) return;
      const next: Record<string, boolean> = {};
      FORMAT_BUTTONS.forEach((b) => {
        try { next[b.cmd] = document.queryCommandState(b.cmd); } catch { next[b.cmd] = false; }
      });
      setActive(next);
    };
    document.addEventListener('selectionchange', onSel);
    return () => document.removeEventListener('selectionchange', onSel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emit = () => {
    if (ref.current) onChange(ref.current.innerHTML, ref.current.innerText);
  };

  function run(cmd: FormatCmd) {
    ref.current?.focus();
    document.execCommand(cmd, false);
    emit();
    try { setActive((a) => ({ ...a, [cmd]: document.queryCommandState(cmd) })); } catch { /* bỏ qua */ }
  }

  // Gõ "1. " / "1) " hoặc "- " / "* " / "• " ở đầu dòng → tự chuyển thành danh sách.
  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== ' ') return;
    const sel = document.getSelection();
    if (!sel || !sel.isCollapsed || !sel.anchorNode || sel.anchorNode.nodeType !== Node.TEXT_NODE) return;
    const node = sel.anchorNode as Text;
    const before = (node.textContent ?? '').slice(0, sel.anchorOffset);
    const isOrdered = /^\d+[.)]$/.test(before);
    const isBullet = /^[-*•]$/.test(before);
    if (!isOrdered && !isBullet) return;
    const prev = node.previousSibling;
    if (prev && !(prev.nodeType === Node.ELEMENT_NODE && (prev as HTMLElement).tagName === 'BR')) return;
    if (node.parentElement?.closest('li')) return;
    e.preventDefault();
    const range = document.createRange();
    range.setStart(node, 0);
    range.setEnd(node, sel.anchorOffset);
    sel.removeAllRanges();
    sel.addRange(range);
    document.execCommand('delete', false);
    document.execCommand(isOrdered ? 'insertOrderedList' : 'insertUnorderedList', false);
    emit();
  }

  // Dán: chỉ lấy chữ (bỏ định dạng/màu lạ từ nơi khác); link sẽ tự thành đường dẫn khi lưu.
  function onPaste(e: React.ClipboardEvent<HTMLDivElement>) {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
    emit();
  }

  const btn = (on: boolean): React.CSSProperties => ({
    minWidth: 38, height: 36, padding: '0 8px', borderRadius: 9, cursor: 'pointer', fontSize: 15,
    border: '1px solid var(--border)', color: 'var(--text)',
    background: on ? 'var(--chip)' : 'var(--surface)', fontWeight: on ? 800 : 500
  });

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: 8, borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
        {FORMAT_BUTTONS.map((b) => (
          <button
            key={b.cmd}
            type="button"
            title={b.title}
            aria-label={b.title}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => run(b.cmd)}
            style={btn(!!active[b.cmd])}
          >
            {b.label}
          </button>
        ))}
      </div>
      <div
        ref={ref}
        className="note-rich note-editor"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        data-placeholder="Nội dung ghi chú... (gõ 1. hoặc - đầu dòng để tạo danh sách)"
        onInput={emit}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        style={{
          minHeight: 180, maxHeight: '45vh', overflowY: 'auto', padding: 12, fontSize: 15, lineHeight: 1.55,
          outline: 'none', background: 'var(--surface)', color: 'var(--text)', whiteSpace: 'pre-wrap'
        }}
      />
    </div>
  );
}

function NoteEditor({
  heading,
  initial,
  saving,
  error,
  onCancel,
  onSave
}: {
  heading: string;
  initial: { title: string; content: string; color: ColorKey };
  saving: boolean;
  error: string;
  onCancel: () => void;
  onSave: (v: { title: string; content: string; color: ColorKey }) => void;
}) {
  const [title, setTitle] = useState(initial.title);
  const [html, setHtml] = useState('');
  const [plain, setPlain] = useState('');
  const [color, setColor] = useState<ColorKey>(initial.color);
  const initialHtml = useRef(initial.content ? sanitizeNoteHtml(noteToHtml(initial.content)) : '').current;
  const stored = html ? editorHtmlToStored(html) : '';
  const tooLong = stored.length > MAX_NOTE_LENGTH;
  const ok = plain.trim().length > 0 && !tooLong;
  const field: React.CSSProperties = {
    width: '100%', borderRadius: 12, border: '1px solid var(--border)', fontFamily: 'inherit',
    background: 'var(--surface)', color: 'var(--text)', boxSizing: 'border-box'
  };
  return (
    <div>
      <div onClick={saving ? undefined : onCancel} style={backdrop} />
      <div style={sheetStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{heading}</h3>
          <button onClick={onCancel} disabled={saving} aria-label="Đóng" style={{ border: 'none', background: 'transparent', fontSize: 16, cursor: 'pointer', color: 'var(--text)' }}>
            ✕
          </button>
        </div>

        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          placeholder="Tiêu đề ghi chú"
          style={{ ...field, height: 46, padding: '0 12px', fontSize: 16, fontWeight: 700, marginBottom: 10 }}
        />
        <style>{RICH_CSS}</style>
        <RichEditor
          initialHtml={initialHtml}
          onChange={(h, t) => {
            setHtml(h);
            setPlain(t);
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 6, marginBottom: 14, fontSize: 11.5, color: 'var(--muted)' }}>
          <span>
            {error && <span style={{ color: 'var(--st-red)' }}>{error}</span>}
            {!error && tooLong && <span style={{ color: 'var(--st-red)' }}>Ghi chú quá dài — vui lòng rút gọn hoặc tách thành 2 ghi chú.</span>}
          </span>
          <span style={{ whiteSpace: 'nowrap', color: tooLong ? 'var(--st-red)' : undefined }}>
            {Math.min(100, Math.round((stored.length / MAX_NOTE_LENGTH) * 100))}% dung lượng
          </span>
        </div>

        <ColorPicker value={color} onChange={setColor} />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
          <button
            onClick={onCancel}
            disabled={saving}
            style={{ height: 42, padding: '0 18px', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            Huỷ
          </button>
          <button
            onClick={() => onSave({ title: title.trim(), content: stored, color })}
            disabled={!ok || saving}
            style={{
              height: 42, padding: '0 22px', borderRadius: 10, border: 'none', background: 'var(--accent)', color: 'var(--accent-contrast)',
              fontSize: 14, fontWeight: 700, cursor: !ok || saving ? 'default' : 'pointer', opacity: !ok || saving ? 0.55 : 1
            }}
          >
            {saving ? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>
      </div>
    </div>
  );
}

function NoteMeta({ n, sub }: { n: TeamNote; sub: string }) {
  return (
    <div style={{ fontSize: 11.5, color: sub, lineHeight: 1.45, minWidth: 0 }}>
      <div style={{ fontWeight: 700 }}>{n.author?.name ?? '—'}</div>
      <div>{formatStamp(n.created_at)}</div>
      {n.updated_at && (
        <div style={{ fontStyle: 'italic' }}>
          Đã sửa{n.editor?.name && n.editor.id !== n.created_by ? ` bởi ${n.editor.name}` : ''} · {formatStamp(n.updated_at)}
        </div>
      )}
    </div>
  );
}

function ActionButtons({ fg, onEdit, onDelete }: { fg: string; onEdit: () => void; onDelete: () => void }) {
  const btn: React.CSSProperties = {
    width: 36, height: 36, borderRadius: 10, border: 'none', cursor: 'pointer', display: 'flex',
    alignItems: 'center', justifyContent: 'center', background: 'rgba(127,127,127,0.16)', color: fg
  };
  return (
    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
      <button onClick={(e) => { e.stopPropagation(); onEdit(); }} aria-label="Sửa ghi chú" title="Sửa" style={btn}>
        <PenIcon />
      </button>
      <button onClick={(e) => { e.stopPropagation(); onDelete(); }} aria-label="Xoá ghi chú" title="Xoá" style={btn}>
        <TrashIcon />
      </button>
    </div>
  );
}

export default function NotesTab({ me }: { me: Staff | null }) {
  const supabase = createClient();
  const [notes, setNotes] = useState<TeamNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [editor, setEditor] = useState<{ mode: 'new' } | { mode: 'edit'; note: TeamNote } | null>(null);
  const [viewing, setViewing] = useState<TeamNote | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<TeamNote | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('team_notes')
      .select('id, title, content, color, created_at, updated_at, created_by, author:staff!team_notes_created_by_fkey(id, name), editor:staff!team_notes_updated_by_fkey(id, name)')
      .order('created_at', { ascending: false });
    if (error) {
      setLoadError('Không tải được ghi chú. Vui lòng thử lại.');
    } else {
      setLoadError('');
      const list = (data as unknown as TeamNote[]) ?? [];
      setNotes(list);
      setViewing((v) => (v ? list.find((x) => x.id === v.id) ?? null : null));
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save(v: { title: string; content: string; color: ColorKey }) {
    if (!editor || !v.content) return;
    setSaving(true);
    setSaveError('');
    const payload = { title: v.title || null, content: v.content, color: v.color };
    const res =
      editor.mode === 'new'
        ? await supabase.from('team_notes').insert(payload)
        : await supabase.from('team_notes').update(payload).eq('id', editor.note.id);
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
    setViewing(null);
    load();
  }

  function openEdit(n: TeamNote) {
    setSaveError('');
    setEditor({ mode: 'edit', note: n });
  }

  const teamName = me?.department?.name ?? 'team của bạn';
  const vp = viewing ? paletteFor(viewing) : null;

  return (
    <div>
      <style>{RICH_CSS}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.4, margin: '0 0 4px' }}>Ghi chú</h1>
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
        <div style={{ fontSize: 13.5, color: 'var(--st-red)' }}>{loadError}</div>
      ) : notes.length === 0 ? (
        <div style={{ border: '1px dashed var(--border)', borderRadius: 16, padding: '40px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
          Chưa có ghi chú nào. Bấm <strong style={{ color: 'var(--text)' }}>+</strong> để ghim ghi chú đầu tiên cho team.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 16, alignItems: 'start' }}>
          {notes.map((n) => {
            const p = paletteFor(n);
            return (
              <div
                key={n.id}
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest('a')) return;
                  setViewing(n);
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') setViewing(n); }}
                style={{
                  position: 'relative', background: p.bg, color: p.fg, borderRadius: 14, cursor: 'pointer',
                  padding: '16px 16px 12px', display: 'flex', flexDirection: 'column', gap: 8,
                  boxShadow: '0 2px 6px rgba(20,20,19,0.10)', border: n.color === 'white' ? '1px solid var(--border)' : 'none'
                }}
              >
                <span aria-hidden style={{ position: 'absolute', top: -7, left: '50%', marginLeft: -7, fontSize: 15 }}>📌</span>
                {n.title && (
                  <div style={{ fontSize: 15.5, fontWeight: 700, lineHeight: 1.35, wordBreak: 'break-word' }}>{n.title}</div>
                )}
                <div
                  className="note-rich"
                  style={{
                    fontSize: 14, lineHeight: 1.55, maxHeight: '6.2em', overflow: 'hidden',
                    WebkitMaskImage: 'linear-gradient(180deg, #000 70%, transparent)',
                    maskImage: 'linear-gradient(180deg, #000 70%, transparent)'
                  }}
                  dangerouslySetInnerHTML={{ __html: noteDisplayHtml(n.content) }}
                />
                <div style={{ fontSize: 12, fontWeight: 600, color: p.sub }}>Xem đầy đủ →</div>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8, borderTop: `1px solid ${p.sub.replace(/[\d.]+\)$/, '0.18)')}`, paddingTop: 10 }}>
                  <NoteMeta n={n} sub={p.sub} />
                  {!!me && <ActionButtons fg={p.fg} onEdit={() => openEdit(n)} onDelete={() => setDeleteTarget(n)} />}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {viewing && vp && !editor && !deleteTarget && (
        <div>
          <div onClick={() => setViewing(null)} style={backdrop} />
          <div style={{ ...sheetStyle, background: vp.bg, color: vp.fg }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, lineHeight: 1.35, wordBreak: 'break-word' }}>
                {viewing.title || 'Ghi chú'}
              </h3>
              <button onClick={() => setViewing(null)} aria-label="Đóng" style={{ border: 'none', background: 'transparent', fontSize: 16, cursor: 'pointer', color: vp.fg, flexShrink: 0 }}>
                ✕
              </button>
            </div>
            <div
              className="note-rich"
              style={{ fontSize: 15, lineHeight: 1.6 }}
              dangerouslySetInnerHTML={{ __html: noteDisplayHtml(viewing.content) }}
            />
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8, marginTop: 20, paddingTop: 12, borderTop: `1px solid ${vp.sub.replace(/[\d.]+\)$/, '0.18)')}` }}>
              <NoteMeta n={viewing} sub={vp.sub} />
              {!!me && <ActionButtons fg={vp.fg} onEdit={() => openEdit(viewing)} onDelete={() => setDeleteTarget(viewing)} />}
            </div>
          </div>
        </div>
      )}

      {editor && (
        <NoteEditor
          heading={editor.mode === 'new' ? 'Ghi chú mới' : 'Sửa ghi chú'}
          initial={
            editor.mode === 'edit'
              ? { title: editor.note.title ?? '', content: editor.note.content, color: (editor.note.color as ColorKey) || 'pastel' }
              : { title: '', content: '', color: 'pastel' }
          }
          saving={saving}
          error={saveError}
          onCancel={() => setEditor(null)}
          onSave={save}
        />
      )}

      {deleteTarget && (
        <div>
          <div onClick={deleting ? undefined : () => setDeleteTarget(null)} style={backdrop} />
          <div style={{ ...sheetStyle, width: 360 }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700 }}>Xoá ghi chú này?</h3>
            <p style={{ margin: '0 0 18px', fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.5 }}>
              {deleteTarget.title ? `"${deleteTarget.title}" ` : 'Ghi chú '}sẽ bị xoá khỏi bảng của cả team và không khôi phục được.
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
                style={{ height: 42, padding: '0 18px', borderRadius: 10, border: 'none', background: 'var(--st-red)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: deleting ? 0.6 : 1 }}
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
