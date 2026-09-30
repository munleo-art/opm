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
    <div style=