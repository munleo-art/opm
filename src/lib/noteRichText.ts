// Định dạng chữ cho Ghi chú (đậm, nghiêng, gạch chân, gạch ngang, danh sách, link).
// Nội dung lưu dạng HTML có tiền tố RICH_MARK; ghi chú cũ (chữ thường) vẫn hiển thị đúng.
// MỌI HTML đều đi qua sanitizeNoteHtml trước khi hiển thị — chỉ giữ đúng các thẻ định dạng
// được phép, bỏ hết script/style/thuộc tính lạ, để ghi chú không thể chèn mã độc vào trình duyệt
// của đồng nghiệp.

export const RICH_MARK = '<!--rt-->';
export const MAX_NOTE_LENGTH = 5000; // giới hạn ở database (tính cả mã định dạng)

const URL_RE = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+)/gi;
const TRAILING_PUNCT = /[),.;:!?\]'"]+$/;

const TAG_MAP: Record<string, string | null> = {
  B: 'b', STRONG: 'b', I: 'i', EM: 'i', U: 'u', S: 's', STRIKE: 's', DEL: 's',
  BR: 'br', P: 'div', DIV: 'div', UL: 'ul', OL: 'ol', LI: 'li', A: 'a'
};
const DROP = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'TEMPLATE', 'NOSCRIPT', 'SVG', 'MATH', 'HEAD', 'TITLE', 'META', 'LINK']);

function safeHref(raw: string | null): string | null {
  if (!raw) return null;
  const v = raw.trim();
  if (/^https?:\/\//i.test(v)) return v;
  if (/^www\./i.test(v)) return 'https://' + v;
  return null;
}

function makeLink(doc: Document, href: string, text: string) {
  const a = doc.createElement('a');
  a.setAttribute('href', href);
  a.setAttribute('target', '_blank');
  a.setAttribute('rel', 'noopener noreferrer');
  a.textContent = text;
  return a;
}

function appendLinkifiedText(doc: Document, parent: Node, text: string, inLink: boolean) {
  if (inLink) {
    parent.appendChild(doc.createTextNode(text));
    return;
  }
  let last = 0;
  text.replace(URL_RE, (match: string, _g: string, offset: number) => {
    let url = match;
    const trail = url.match(TRAILING_PUNCT)?.[0] ?? '';
    if (trail) url = url.slice(0, -trail.length);
    if (offset > last) parent.appendChild(doc.createTextNode(text.slice(last, offset)));
    const href = safeHref(url);
    parent.appendChild(href ? makeLink(doc, href, url) : doc.createTextNode(url));
    last = offset + url.length;
    return match;
  });
  if (last < text.length) parent.appendChild(doc.createTextNode(text.slice(last)));
}

function styleWrappers(el: HTMLElement): string[] {
  const st = el.style;
  const out: string[] = [];
  const fw = st.fontWeight;
  if (fw === 'bold' || fw === 'bolder' || (parseInt(fw, 10) || 0) >= 600) out.push('b');
  if (st.fontStyle === 'italic') out.push('i');
  const deco = `${st.textDecoration} ${st.textDecorationLine}`;
  if (deco.includes('underline')) out.push('u');
  if (deco.includes('line-through')) out.push('s');
  return out;
}

function walk(doc: Document, src: Node, dest: Node, inLink: boolean) {
  src.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      appendLinkifiedText(doc, dest, child.textContent ?? '', inLink);
      return;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) return;
    const el = child as HTMLElement;
    const tag = el.tagName.toUpperCase();
    if (DROP.has(tag)) return;

    // Thẻ không nằm trong danh sách (span, font...) → bỏ thẻ, giữ chữ, giữ định dạng qua style.
    let target: Node = dest;
    for (const w of styleWrappers(el)) {
      const wrap = doc.createElement(w);
      target.appendChild(wrap);
      target = wrap;
    }

    const mapped = TAG_MAP[tag];
    if (!mapped) {
      walk(doc, el, target, inLink);
      return;
    }
    if (mapped === 'a') {
      const href = safeHref(el.getAttribute('href'));
      if (!href || inLink) {
        walk(doc, el, target, inLink);
        return;
      }
      const a = makeLink(doc, href, '');
      target.appendChild(a);
      walk(doc, el, a, true);
      return;
    }
    const out = doc.createElement(mapped);
    target.appendChild(out);
    if (mapped !== 'br') walk(doc, el, out, inLink);
  });
}

export function sanitizeNoteHtml(html: string): string {
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') return '';
  const parsed = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  const doc = document.implementation.createHTMLDocument('');
  const root = doc.createElement('div');
  walk(doc, parsed.body, root, false);
  return root.innerHTML;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

/** Nội dung lưu trong DB → HTML (chưa sanitize). Ghi chú cũ dạng chữ thường được giữ xuống dòng. */
export function noteToHtml(content: string): string {
  if (content.startsWith(RICH_MARK)) return content.slice(RICH_MARK.length);
  return escapeHtml(content).replace(/\r?\n/g, '<br>');
}

/** HTML an toàn để hiển thị (đã lọc thẻ + tự biến link thành đường dẫn bấm được). */
export function noteDisplayHtml(content: string): string {
  return sanitizeNoteHtml(noteToHtml(content));
}

/** HTML trong ô soạn thảo → chuỗi lưu DB. */
export function editorHtmlToStored(html: string): string {
  return RICH_MARK + sanitizeNoteHtml(html);
}
