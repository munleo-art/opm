'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '../../lib/supabase/client';
import type { Staff, Department } from '../../lib/types';
import { canSeeAdmin, canSeeAllStaffAdmin, visibleStaff } from '../../lib/permissions';

type StaffRow = Staff & { is_active?: boolean; department: Department | null };

function formatDob(dob: string | null) {
  if (!dob) return '—';
  const d = new Date(dob);
  if (isNaN(d.getTime())) return dob;
  return d.toLocaleDateString('vi-VN');
}

const gridCols = '1.4fr 1fr 0.9fr 1.3fr 1.1fr 0.5fr';

export default function AdminShell() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<Staff | null>(null);
  const [rows, setRows] = useState<StaffRow[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<StaffRow | null>(null);
  const [error, setError] = useState('');

  async function fetchAll() {
    setLoading(true);
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) {
      router.replace('/login');
      return;
    }

    const { data: meRow } = await supabase
      .from('staff')
      .select('*, department:departments(id, name)')
      .eq('auth_user_id', user.id)
      .single();

    const myRow = meRow as Staff;
    if (!myRow || !canSeeAdmin(myRow)) {
      router.replace('/dashboard');
      return;
    }
    setMe(myRow);

    const baseQuery = supabase
      .from('staff')
      .select('*, department:departments(id, name)')
      .eq('is_active', true);

    const { data: staffRows, error: staffErr } = canSeeAllStaffAdmin(myRow)
      ? await baseQuery.order('name', { ascending: true })
      : await baseQuery.eq('department_id', myRow.department_id as string).order('name', { ascending: true });

    if (staffErr) {
      setError(staffErr.message);
      setLoading(false);
      return;
    }
    setRows(visibleStaff((staffRows || []) as StaffRow[], myRow));
    setLoading(false);
  }

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function confirmDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    const { error: delErr } = await supabase
      .from('staff')
      .update({ is_active: false })
      .eq('id', target.id);
    if (delErr) {
      setError('Không xóa được: ' + delErr.message);
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== target.id));
  }

  if (loading) {
    return <div style={{ padding: 40, color: 'var(--muted)', fontSize: 13.5 }}>Đang tải…</div>;
  }
  if (!me) return null;

  const groups: { label: string; rows: StaffRow[] }[] = [];
  const byDept = new Map<string, StaffRow[]>();
  rows.forEach((r) => {
    const label = r.department?.name || 'Chưa phân team';
    if (!byDept.has(label)) {
      byDept.set(label, []);
      groups.push({ label, rows: byDept.get(label)! });
    }
    byDept.get(label)!.push(r);
  });

  return (
    <div style={{ minHeight: '100vh', width: '100%', background: 'var(--bg)', color: 'var(--text)' }}>
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          width: '100%',
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 32px',
            height: 64,
            maxWidth: 1400,
            margin: '0 auto'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link
              href="/dashboard"
              aria-label="Về trang chủ"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 36,
                height: 36,
                borderRadius: 9,
                color: 'var(--text)'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 11.5 12 4l9 7.5" />
                <path d="M5.5 10v9a1 1 0 0 0 1 1H9.5a1 1 0 0 0 1-1v-4.5h3V19a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-9" />
              </svg>
            </Link>
            <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: 1.2 }}>QUẢN TRỊ NHÂN SỰ</span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '28px 32px 100px' }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 600 }}>Quản lý nhân sự</h1>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24 }}>
          {canSeeAllStaffAdmin(me) ? `${rows.length} nhân sự trên toàn hệ thống` : `${rows.length} nhân sự của team bạn`}
        </div>

        {error && <div style={{ marginBottom: 16, fontSize: 13, color: '#C63C3C' }}>{error}</div>}

        {groups.length === 0 && <div style={{ fontSize: 13, color: 'var(--muted)' }}>Chưa có nhân sự nào.</div>}

        {groups.map((g) => (
          <div key={g.label} style={{ marginBottom: 26 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: 0.5,
                color: 'var(--muted)',
                textTransform: 'uppercase',
                margin: '0 0 8px 4px'
              }}
            >
              {g.label} · {g.rows.length} người
            </div>
            <div style={{ border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', background: 'var(--surface)' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: gridCols,
                  gap: 10,
                  padding: '11px 16px',
                  borderBottom: '1px solid var(--border)',
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: 'var(--muted)',
                  letterSpacing: 0.3
                }}
              >
                <div>TÊN</div>
                <div>NGÀY SINH</div>
                <div>MÃ NV</div>
                <div>CHỨC VỤ</div>
                <div>SỐ ĐIỆN THOẠI</div>
                <div></div>
              </div>
              {g.rows.map((st) => (
                <div
                  key={st.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: gridCols,
                    gap: 10,
                    alignItems: 'center',
                    padding: '10px 16px',
                    borderBottom: '1px solid var(--border)'
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{st.name}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{formatDob(st.date_of_birth)}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{st.employee_id}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{st.position || '—'}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{st.phone || '—'}</div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => setDeleteTarget(st)}
                      aria-label="Xóa nhân sự"
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 8,
                        border: 'none',
                        background: 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#C63C3C" strokeWidth="2.2" strokeLinecap="round">
                        <path d="M6 6l12 12M18 6 6 18" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {deleteTarget && (
        <>
          <div
            onClick={() => setDeleteTarget(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(20,20,19,0.4)', zIndex: 100 }}
          />
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%,-50%)',
              width: 320,
              background: 'var(--surface)',
              color: 'var(--text)',
              borderRadius: 20,
              padding: 26,
              zIndex: 101,
              boxShadow: '0 24px 60px rgba(20,20,19,0.3)',
              textAlign: 'center'
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 14.5, marginBottom: 6 }}>{deleteTarget.name}</div>
            <div style={{ fontSize: 13.5, color: 'var(--muted)', marginBottom: 20 }}>
              Chắc chắn muốn xóa nhân sự này khỏi danh sách?
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                onClick={() => setDeleteTarget(null)}
                style={{
                  height: 42,
                  padding: '0 20px',
                  borderRadius: 10,
                  border: 'none',
                  background: 'var(--chip)',
                  color: 'var(--text)',
                  fontSize: 13.5,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Hủy
              </button>
              <button
                onClick={confirmDelete}
                style={{
                  height: 42,
                  padding: '0 20px',
                  borderRadius: 10,
                  border: 'none',
                  background: '#C63C3C',
                  color: '#FFFFFF',
                  fontSize: 13.5,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Đồng ý
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
