'use client';

import { useMemo, useState } from 'react';
import type { Project, Staff } from '../../lib/types';
import { canAddProject } from '../../lib/permissions';

type SortKey = 'name-asc' | 'name-desc' | 'group';
type ViewMode = 'grid' | 'list';

export default function ProjectsTab({
  projects,
  me,
  onSelectProject,
  onAddProject
}: {
  projects: Project[];
  me: Staff | null;
  onSelectProject: (id: string) => void;
  onAddProject: () => void;
}) {
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name-asc');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const visibleProjects = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q ? projects.filter((p) => p.title.toLowerCase().includes(q)) : projects.slice();

    const sorted = filtered.sort((a, b) => {
      if (sortKey === 'name-asc') return a.title.localeCompare(b.title, 'vi');
      if (sortKey === 'name-desc') return b.title.localeCompare(a.title, 'vi');
      return a.group_name.localeCompare(b.group_name, 'vi') || a.title.localeCompare(b.title, 'vi');
    });

    return sorted;
  }, [projects, query, sortKey]);

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
          gap: 12,
          flexWrap: 'wrap'
        }}
      >
        <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>Dự án</h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm tên dự án..."
            style={{
              height: 36,
              padding: '0 12px',
              borderRadius: 9,
              border: '1px solid var(--border)',
              fontSize: 13,
              width: 200
            }}
          />

          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            style={{
              height: 36,
              padding: '0 10px',
              borderRadius: 9,
              border: '1px solid var(--border)',
              fontSize: 12.5,
              background: 'var(--surface)'
            }}
          >
            <option value="name-asc">Tên A → Z</option>
            <option value="name-desc">Tên Z → A</option>
            <option value="group">Theo nhóm</option>
          </select>

          <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 9, overflow: 'hidden' }}>
            <button
              onClick={() => setViewMode('grid')}
              aria-label="Xem dạng lưới"
              style={{
                height: 36,
                width: 36,
                border: 'none',
                background: viewMode === 'grid' ? 'var(--accent)' : 'transparent',
                color: viewMode === 'grid' ? 'var(--accent-contrast)' : 'var(--text)',
                cursor: 'pointer',
                fontSize: 14
              }}
            >
              ▦
            </button>
            <button
              onClick={() => setViewMode('list')}
              aria-label="Xem dạng danh sách"
              style={{
                height: 36,
                width: 36,
                border: 'none',
                background: viewMode === 'list' ? 'var(--accent)' : 'transparent',
                color: viewMode === 'list' ? 'var(--accent-contrast)' : 'var(--text)',
                cursor: 'pointer',
                fontSize: 14
              }}
            >
              ☰
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 16
          }}
        >
          {canAddProject(me) && (
            <button
              onClick={onAddProject}
              style={{
                height: 140,
                borderRadius: 16,
                border: '2px dashed var(--border)',
                background: 'transparent',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                cursor: 'pointer',
                color: 'var(--muted)'
              }}
            >
              <span style={{ fontSize: 22 }}>+</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Thêm dự án</span>
            </button>
          )}
          {visibleProjects.map((p) => (
            <div
              key={p.id}
              onClick={() => onSelectProject(p.id)}
              style={{
                height: 140,
                borderRadius: 16,
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                padding: 16,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{p.title}</div>
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--muted-2)' }}>{p.group_name}</div>
            </div>
          ))}
          {visibleProjects.length === 0 && (
            <div style={{ fontSize: 12.5, color: 'var(--muted)', padding: '20px 0' }}>
              Không tìm thấy dự án nào khớp.
            </div>
          )}
        </div>
      ) : (
        <div style={{ border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', background: 'var(--surface)' }}>
          {canAddProject(me) && (
            <button
              onClick={onAddProject}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                textAlign: 'left',
                padding: '12px 16px',
                border: 'none',
                borderBottom: '1px solid var(--border)',
                background: 'transparent',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--muted)'
              }}
            >
              <span style={{ fontSize: 16 }}>+</span> Thêm dự án
            </button>
          )}
          {visibleProjects.map((p) => (
            <div
              key={p.id}
              onClick={() => onSelectProject(p.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                padding: '12px 16px',
                borderBottom: '1px solid var(--border)',
                cursor: 'pointer'
              }}
            >
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>{p.title}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ fontSize: 11.5, color: 'var(--muted-2)' }}>{p.group_name}</div>
              </div>
            </div>
          ))}
          {visibleProjects.length === 0 && (
            <div style={{ padding: 16, fontSize: 12.5, color: 'var(--muted)' }}>Không tìm thấy dự án nào khớp.</div>
          )}
        </div>
      )}
    </div>
  );
}
