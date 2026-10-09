import { json, originOf, preflight, protectedResourceMetadata } from '../../../../lib/mcp/common';

export const dynamic = 'force-dynamic';

export function GET(req: Request) {
  return json(protectedResourceMetadata(originOf(req)));
}

export function OPTIONS() {
  return preflight();
}
