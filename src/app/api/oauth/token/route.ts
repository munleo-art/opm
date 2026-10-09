import { anonClient, json, preflight } from '../../../../lib/mcp/common';

export const dynamic = 'force-dynamic';

async function readParams(req: Request): Promise<Record<string, string>> {
  const type = req.headers.get('content-type') || '';
  const out: Record<string, string> = {};
  if (type.includes('application/json')) {
    const b = await req.json().catch(() => ({}));
    for (const [k, v] of Object.entries(b || {})) if (typeof v === 'string') out[k] = v;
  } else {
    const text = await req.text();
    new URLSearchParams(text).forEach((v, k) => (out[k] = v));
  }
  // Hỗ trợ client gửi client_id qua header Basic
  const auth = req.headers.get('authorization') || '';
  if (!out.client_id && auth.toLowerCase().startsWith('basic ')) {
    try {
      const decoded = atob(auth.slice(6).trim());
      out.client_id = decodeURIComponent(decoded.split(':')[0]);
    } catch {
      /* bỏ qua */
    }
  }
  return out;
}

export async function POST(req: Request) {
  const p = await readParams(req);
  const supabase = anonClient();

  if (p.grant_type === 'authorization_code') {
    const { data, error } = await supabase.rpc('mcp_exchange_code', {
      p_code: p.code || '',
      p_client_id: p.client_id || '',
      p_redirect_uri: p.redirect_uri || '',
      p_code_verifier: p.code_verifier || ''
    });
    if (error || !data) return json({ error: 'invalid_grant', error_description: 'Mã uỷ quyền không hợp lệ hoặc đã hết hạn' }, 400);
    return json(data);
  }

  if (p.grant_type === 'refresh_token') {
    const { data, error } = await supabase.rpc('mcp_refresh', {
      p_refresh_token: p.refresh_token || '',
      p_client_id: p.client_id || ''
    });
    if (error || !data) return json({ error: 'invalid_grant', error_description: 'Refresh token không hợp lệ hoặc đã hết hạn' }, 400);
    return json(data);
  }

  return json({ error: 'unsupported_grant_type' }, 400);
}

export function OPTIONS() {
  return preflight();
}
