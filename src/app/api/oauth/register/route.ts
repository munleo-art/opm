import { anonClient, json, preflight } from '../../../../lib/mcp/common';

export const dynamic = 'force-dynamic';

// Đăng ký client động (RFC 7591) — Claude/ChatGPT tự gọi khi người dùng thêm connector.
export async function POST(req: Request) {
  let body: { client_name?: string; redirect_uris?: string[] };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid_client_metadata', error_description: 'Body phải là JSON' }, 400);
  }

  const redirectUris = Array.isArray(body.redirect_uris) ? body.redirect_uris.filter((u) => typeof u === 'string') : [];
  if (redirectUris.length === 0) {
    return json({ error: 'invalid_redirect_uri', error_description: 'Thiếu redirect_uris' }, 400);
  }

  const { data, error } = await anonClient().rpc('mcp_register_client', {
    p_client_name: body.client_name || '',
    p_redirect_uris: redirectUris
  });

  if (error || !data) {
    return json({ error: 'invalid_redirect_uri', error_description: 'redirect_uris không hợp lệ' }, 400);
  }

  return json(
    {
      client_id: data,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_name: body.client_name || '',
      redirect_uris: redirectUris,
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
      scope: 'read'
    },
    201
  );
}

export function OPTIONS() {
  return preflight();
}
