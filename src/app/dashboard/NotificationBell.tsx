'use client';

import { useState } from 'react';
import { createClient } from '../../lib/supabase/client';
import type { NotificationRow } from '../../lib/types';

function relativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
}

export default function NotificationBell({
  notifications,
  onOpenProject,
  onRefetch
}: {
  notifications: NotificationRow[];
  onOpenProject: (projectId: string) => void;
  onRefetch: () => void;
}) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);

  const sorted = [...notifications].sort(
    (a, b) =>
      new Date(b.notification?.created_at ?? 0).getTime() -
      new Date(a.notification?.created_at ?? 0).getTime()
  );
  const unreadCount = notifications.filter((n) => !n.read_at).length;

  async function handleToggle() {
    const opening = !open;
    setOpen(opening);
    if (opening && unreadCount > 0) {
      const unreadIds = notifications.filter((n) => !n.read_at).map((n) => n.notification_id);
      await supabase
        .from('notification_recipients')
        .update({ read_at: new Date().toISOString() })
        .in('notification_id', unreadIds);
      onRefetch();
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={handleToggle}
        aria-label="Thông báo"
        style={{
          position: 'relative',
          width: 38,
          height: 38,
          borderRadius: 10,
          border: '1px solid var(--border)',
          background: open ? 'var(--chip)' : 'transparent',
          cursor: 'pointer',
          fontSize: 16
        }}
      >
        🔔
        {unreadCount > 0 && (
          <div
            style={{
              position: 'absolute',
              top: 4,
              right: 4,
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#C63C3C',
              border: '1.5px solid var(--surface)'
            }}
          />
        )}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 46,
            right: 0,
            width: 340,
            maxHeight: 420,
            overflowY: 'auto',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            boxShadow: '0 16px 40px rgba(20,20,19,0.18)',
            padding: 8,
            zIndex: 50
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 0.4,
              textTransform: 'uppercase',
              color: 'var(--muted)',
              padding: '10px 10px 6px'
            }}
          >
            Thông báo
          </div>
          {sorted.length === 0 && (
            <div style={{ padding: '24px 10px', textAlign: 'center', fontSize: 12.5, color: 'var(--muted)' }}>
              Chưa có thông báo nào.
            </div>
          )}
          {sorted.map((n) => (
            <button
              key={n.notification_id}
              onClick={() => {
                setOpen(false);
                if (n.notification?.project_id) onOpenProject(n.notification.project_id);
              }}
              style={{
                display: 'flex',
                width: '100%',
                textAlign: 'left',
                gap: 10,
                padding: 10,
                border: 'none',
                background: 'transparent',
                borderRadius: 10,
                cursor: 'pointer'
              }}
            >
              <div
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: n.read_at ? 'transparent' : 'var(--accent)',
                  marginTop: 6,
                  flexShrink: 0
                }}
              />
              <div style={{ flexGrow: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{n.notification?.title}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2, lineHeight: 1.4 }}>
                  {n.notification?.detail}
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--muted-2)', marginTop: 4 }}>
                  {n.notification?.created_at ? relativeTime(n.notification.created_at) : ''}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
