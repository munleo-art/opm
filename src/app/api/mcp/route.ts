// MCP server (Streamable HTTP, không trạng thái) — CHỈ ĐỌC — cho Claude/ChatGPT của từng nhân viên.
import { anonClient, CORS_HEADERS, json, originOf, preflight } from '../../../lib/mcp/common';
import { runTool, Snapshot, TOOLS } from '../../../lib/mcp/tools';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const SUPPORTED_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];

type RpcRequest = { jsonrpc: '2.0'; id?: string | number | null; method: string; params?: any };

function unauthorized(origin: string) {
  return json(
    { jsonrpc: '2.0', id: null, error: { code: -32001, message: 'Cần đăng nhập để kết nối ODE Project Manager' } },
    401,
    { 'WWW-Authenticate': `Bearer realm="ode", resource_metadata="${origin}/.well-known/oauth-protected-resource"` }
  );
}

async function loadSnapshot(token: string): Promise<Snapshot | null> {
  const { data, error } = await anonClient().rpc('mcp_snapshot_for_token', { p_access_token: token });
  if (error || !data) return null;
  return data as Snapshot;
}

function handle(msg: RpcRequest, snapshot: Snapshot, origin: string) {
  const ok = (result: unknown) => ({ jsonrpc: '2.0', id: msg.id ?? null, result });
  const fail = (code: number, message: string) => ({ jsonrpc: '2.0', id: msg.id ?? null, error: { code, message } });

  switch (msg.method) {
    case 'initialize': {
      const requested = msg.params?.protocolVersion;
      return ok({
        protocolVersion: SUPPORTED_VERSIONS.includes(requested) ? requested : SUPPORTED_VERSIONS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'ode-project-manager', title: 'ODE Project Manager (chỉ đọc)', version: '1.0.0' },
        instructions:
          'Dữ liệu tiến độ công việc của 4 phòng ban (Ban Sáng tạo, Team Dựng phim, Ban Marketing BĐS, Ban Lãnh đạo). ' +
          'Chỉ đọc: không thể thêm/sửa/xoá. Trả lời người dùng bằng tiếng Việt. Ngày giờ theo giờ Việt Nam. ' +
          'Với câu hỏi "việc chưa làm hôm nay theo dự án", gọi viec_chua_hoan_thanh với han_den_ngay = ngày hôm nay.'
      });
    }
    case 'ping':
      return ok({});
    case 'tools/list':
      return ok({ tools: TOOLS });
    case 'tools/call': {
      const name = msg.params?.name;
      if (!TOOLS.some((t) => t.name === name)) return fail(-32602, `Không có công cụ ${name}`);
      try {
        const result = runTool(name, msg.params?.arguments || {}, snapshot, origin);
        return ok({ content: [{ type: 'text', text: JSON.stringify(result) }], structuredContent: result, isError: false });
      } catch (e: any) {
        return ok({ content: [{ type: 'text', text: `Lỗi: ${e?.message || e}` }], isError: true });
      }
    }
    case 'resources/list':
      return ok({ resources: [] });
    case 'prompts/list':
      return ok({ prompts: [] });
    default:
      return fail(-32601, `Phương thức không được hỗ trợ: ${msg.method}`);
  }
}

export async function POST(req: Request) {
  const origin = originOf(req);
  const auth = req.headers.get('authorization') || '';
  const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
  if (!token) return unauthorized(origin);

  const snapshot = await loadSnapshot(token);
  if (!snapshot) return unauthorized(origin);

  let body: RpcRequest | RpcRequest[];
  try {
    body = await req.json();
  } catch {
    return json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }, 400);
  }

  const messages = Array.isArray(body) ? body : [body];
  const responses = messages
    .filter((m) => m && typeof m === 'object' && m.id !== undefined && m.id !== null && typeof m.method === 'string')
    .map((m) => handle(m, snapshot, origin));

  // Chỉ có notification/response => 202 không nội dung
  if (responses.length === 0) return new Response(null, { status: 202, headers: CORS_HEADERS });
  return json(Array.isArray(body) ? responses : responses[0]);
}

export function GET() {
  // Không hỗ trợ luồng SSE từ server
  return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'POST, OPTIONS', ...CORS_HEADERS } });
}

export function DELETE() {
  return new Response(null, { status: 405, headers: { Allow: 'POST, OPTIONS', ...CORS_HEADERS } });
}

export function OPTIONS() {
  return preflight();
}
