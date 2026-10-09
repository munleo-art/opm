import { authServerMetadata, json, originOf, preflight } from '../../../../lib/mcp/common';

export const dynamic = 'force-dynamic';

export function GET(req: Request) {
  return json(authServerMetadata(originOf(req)));
}

export function OPTIONS() {
  return preflight();
}
