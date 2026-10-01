import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const webhookUrl = process.env.REPORT_SHEET_WEBHOOK_URL;
  const secret = process.env.REPORT_SHEET_SECRET;

  if (!webhookUrl || !secret) {
    return NextResponse.json({ error: 'not_configured' }, { status: 500 });
  }

  let body: { title?: string; header?: string[]; rows?: string[][] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  try {
    const upstream = await fetch(webhookUrl, {
      method: 'POST',
      body: JSON.stringify({
        secret,
        title: body.title || 'Báo cáo tổng hợp',
        header: body.header || [],
        rows: body.rows || []
      }),
      redirect: 'follow'
    });

    const data = await upstream.json();

    if (!data || !data.url) {
      return NextResponse.json({ error: data?.error || 'upstream_error' }, { status: 502 });
    }

    return NextResponse.json({ url: data.url });
  } catch {
    return NextResponse.json({ error: 'upstream_unreachable' }, { status: 502 });
  }
}
