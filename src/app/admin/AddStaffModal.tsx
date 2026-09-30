'use client';

import { useState } from 'react';
import { createClient } from '../../lib/supabase/client';
import type { Department, Permission, Staff } from '../../lib/types';
import { canSeeAllStaffAdmin } from '../../lib/permissions';
import DatePicker from '../dashboard/DatePicker';

const PERMISSIONS: Permission[] = ['Cấp nhân sự', 'Cấp chuyên viên', 'Cấp lãnh đạo', 'Admin'];

function errorMessage(code: string) {
  switch (code) {
    case 'employee_id_exists':
      return 'Mã nhân viên này đã tồn tại trong hệ thống.';
    case 'employee_id_required':
      return 'Vui lòng nhập Mã nhân viên.';
    case 'name_required':
      return 'Vui lòng nhập Tên.';
    case 'phone_required':
      return 'Vui lòng nhập Số điện thoại (cần để nhân sự tự kích hoạt tài khoản).';
    case 'not_authorized':
      return 'Bạn không có quyền thực hiện thao tác này.';
    case 'invalid_permission':
      return 'Phân quyền không hợp lệ.';
    default:
      return 'Có lỗi xảy ra, vui lòng thử lại.';
  }
}

export default function AddStaffModal({
  me,
  departments,
  onClose,
  onCreated
}: {
  me: Staff;
  departments: Department[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const supabase = createClient();
  const isAdmin = me.permission === 'Admin';
  const canPickDepartment = canSeeAllStaffAdmin(me);
  const selectableDepartments = canPickDepartment
    ? departments
    : departments.filter((d) => d.id === me.department_id);

  const [name, setName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [departmentId, setDepartmentId] = useState(
    selectableDepartments.find((d) => d.id === me.department_id)?.id || (selectableDepartments[0]?.id ?? '')
  );
  const [position, setPosition] = useState('');
  const [permission, setPermission] = useState<Permission>('Cấp chuyên viên');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState<{ employee_id: string; name: string } | null>(null);

  const availablePermissions = PERMISSIONS.filter((p) => p !== 'Admin' || isAdmin);

  const canSubmit = name.trim() && employeeId.trim() && phone.trim() && !saving;

  async function handleCreate() {
    if (!canSubmit) return;
    setSaving(true);
    setError('');

    const { data, error: rpcError } = await supabase.rpc('create_staff_with_account', {
      p_employee_id: employeeId.trim(),
      p_name: name.trim(),
      p_phone: phone.trim(),
      p_date_of_birth: dob || null,
      p_department_id: departmentId || null,
      p_position: position.trim() || null,
      p_permission: permission
    });

    setSaving(false);

    if (rpcError || !data?.success) {
      setError(errorMessage(data?.error || 'unknown'));
      return;
    }

    setCreated({ employee_id: data.employee_id, name: data.name });
    onCreated();
  }

  return (
    <div>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(20,20,19,0.45)', zIndex: 110 }}
      />
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%,-50%)',
          width: 400,
          maxHeight: '86vh',
          overflowY: 'auto',
          background: 'var(--surface)',
          color: 'var(--text)',
          borderRadius: 20,
          padding: 24,
          zIndex: 111
        }}
      >
        {created ? (
          <div>
            <h3 style={{ margin: '0 0 10px', fontSize: 16, fontWeight: 700 }}>Đã tạo tài khoản</h3>
            <div style={{ fontSize: 13.5, lineHeight: 1.6, marginBottom: 18 }}>
              Đã thêm <b>{created.name}</b> (Mã NV: <b>{created.employee_id}</b>) và tạo sẵn tài khoản đăng nhập.
              <br />
              Nhân sự vào trang <b>/kich-hoat</b>, nhập đúng Mã nhân viên và Số điện thoại vừa nhập để tự đặt mật khẩu.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => {
                  setCreated(null);
                  setName('');
                  setEmployeeId('');
                  setPhone('');
                  setDob('');
                  setPosition('');
                }}
                style={{
                  flex: 1,
                  height: 42,
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  background: 'transparent',
                  color: 'var(--text)',
                  fontSize: 13.5,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Thêm người khác
              </button>
              <button
                onClick={onClose}
                style={{
                  flex: 1,
                  height: 42,
                  borderRadius: 10,
                  border: 'none',
                  background: 'var(--accent)',
                  color: 'var(--accent-contrast)',
                  fontSize: 13.5,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Xong
              </button>
            </div>
          </div>
        ) : (
          <div>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700 }}>Thêm nhân sự</h3>

            <label style={fieldLabelStyle}>
              Tên
              <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
            </label>

            <label style={fieldLabelStyle}>
              Mã nhân viên
              <input value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} style={inputStyle} />
            </label>

            <label style={fieldLabelStyle}>
              Số điện thoại
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="VD: 0912345678"
                style={inputStyle}
              />
            </label>

            <label style={fieldLabelStyle}>
              Ngày sinh
              <DatePicker value={dob} onChange={setDob} placeholder="Chọn ngày sinh" />
            </label>

            <label style={fieldLabelStyle}>
              Phòng ban
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                disabled={!canPickDepartment}
                style={inputStyle}
              >
                {canPickDepartment && <option value="">— Chưa phân team —</option>}
                {selectableDepartments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>

            <label style={fieldLabelStyle}>
              Chức vụ
              <input value={position} onChange={(e) => setPosition(e.target.value)} style={inputStyle} />
            </label>

            <label style={{ ...fieldLabelStyle, marginBottom: 18 }}>
              Phân quyền
              <select
                value={permission}
                onChange={(e) => setPermission(e.target.value as Permission)}
                style={inputStyle}
              >
                {availablePermissions.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>

            {error && <div style={{ fontSize: 12.5, color: '#C63C3C', marginBottom: 14 }}>{error}</div>}

            <button
              onClick={handleCreate}
              disabled={!canSubmit}
              style={{
                width: '100%',
                height: 44,
                borderRadius: 10,
                border: 'none',
                background: canSubmit ? 'var(--accent)' : 'var(--border)',
                color: canSubmit ? 'var(--accent-contrast)' : 'var(--muted)',
                fontSize: 14,
                fontWeight: 700,
                cursor: canSubmit ? 'pointer' : 'default'
              }}
            >
              {saving ? 'Đang tạo...' : 'Tạo nhân sự'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const fieldLabelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  fontSize: 11.5,
  fontWeight: 600,
  color: 'var(--muted)',
  marginBottom: 14
};

const inputStyle: React.CSSProperties = {
  height: 40,
  padding: '0 10px',
  borderRadius: 9,
  border: '1px solid var(--border)',
  fontSize: 13,
  background: 'var(--surface)',
  color: 'var(--text)'
};
