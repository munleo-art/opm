'use client';

import { useMemo, useState } from 'react';
import type { Project, Brief } from '../../lib/types';

const BDS_GROUPS = ['BĐS Miền Bắc', 'BĐS Miền Trung', 'BĐS Miền Nam'];

type SortKey = 'name-asc' | 'name-desc' | 'group';
type ViewMode = 'grid' | 'list';

function ProjectBriefBlock({
  project,
  briefs,
  onSelectProject,
  forceLight
}: {
  project: Project;
  briefs: Brief[];
  onSelectProject: (id: string) => void;
  forceLight?: boolean;
}) {
  const surface = forceLight ? '#FFFFFF' : 'var(--surface)';
  const border = forceLight ? '#E5E5E5' : 'var(--border)';
  const text = forceLight ? '#141413' : 'var(--text)';
  const muted = forceLight ? '#6B6B68' : 'var(--muted)';
  const muted2 = forceLight ? '#B2B2B2' : 'var(--muted-2)';

  return (
    <div
      style={{
        background: surface,
        border: `1px solid ${border}`,
        borderRadius: 12,
        padding: '10px 14px',
        marginBottom: 12
      }}
    >
      <button
        onClick={() => onSelectProject(project.id)}
        style={{
          display: 'block',
          width: '100%',
          textAlign: 'left',
          background: 'none',
          border: 'none',
          padding: 0,
          fontSize: 13.5,
          fontWeight: 600,
          marginBottom: 6,
          cursor: 'pointer',
          color: text
        }}
      >
        {project.title}
      </button>
      {briefs.map((b) => (
        <div
          key={b.id}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 10,
            padding: '5px 0',
            borderTop: `1px solid ${border}`,
            fontSize: 12.5
          }}
        >
          <div style={{ color: muted }}>
            • {b.title}
            {b.link_url && (
              <a href={b.link_url} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 6, color: text }}>
                ↗
              </a>
            )}
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: text }}>{b.poster?.name}</div>
            <div style={{ fontSize: 10, color: muted2 }}>
              {new Date(b.posted_at).toLocaleString('vi-VN')}
            </div>
          </div>
        </div>
      ))}
      {briefs.length === 0 && (
        <div style={{ fontSize: 12, color: muted2, padding: '4px 0' }}>Chưa có brief.</div>
      )}
    </div>
  );
}

function sortProjects(list: Project[], sortKey: SortKey) {
  return [...list].sort((a, b) => {
    if (sortKey === 'name-asc') return a.title.localeCompare(b.title, 'vi');
    if (sortKey === 'name-desc') return b.title.localeCompare(a.title, 'vi');
    return a.group_name.localeCompare(b.group_name, 'vi') || a.title.localeCompare(b.title, 'vi');
  });
}

export default function BriefTab({
  projects,
  briefs,
  onSelectProject
}: {
  projects: Project[];
  briefs: Brief[];
  onSelectProject: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name-asc');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const filteredProjects = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? projects.filter((p) => p.title.toLowerCase().includes(q)) : projects;
  }, [projects, query]);

  const bdsProjects = sortProjects(
    filteredProjects.filter((p) => BDS_GROUPS.includes(p.group_name)),
    sortKey
  );
  const corpProjects = sortProjects(
    filteredProjects.filter((p) => !BDS_GROUPS.includes(p.group_name)),
    sortKey
  );
  const corpGroups = Array.from(new Set(corpProjects.map((p) => p.group_name)));

  const allSorted = sortProjects(filteredProjects, sortKey === 'group' ? 'group' : sortKey);

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
        <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>Brief</h1>

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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div style={{ background: '#FCEBC8', borderRadius: 20, padding: 22, color: '#141413' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 17, fontWeight: 700, color: '#141413' }}>Bất động sản</h3>
            {BDS_GROUPS.map((group) => {
              const groupProjects = bdsProjects.filter((p) => p.group_name === group);
              if (groupProjects.length === 0) return null;
              return (
                <div key={group} style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: '#6B6B68', marginBottom: 8 }}>
                    {group.replace('BĐS ', '').toUpperCase()}
                  </div>
                  {groupProjects.map((p) => (
                    <ProjectBriefBlock
                      key={p.id}
                      project={p}
                      briefs={briefs.filter((b) => b.project_id === p.id)}
                      onSelectProject={onSelectProject}
                      forceLight
                    />
                  ))}
                </div>
              );
            })}
            {bdsProjects.length === 0 && (
              <div style={{ fontSize: 12.5, color: '#6B6B68' }}>Không tìm thấy dự án bất động sản nào.</div>
            )}
          </div>

          <div style={{ background: '#D2E4FF', borderRadius: 20, padding: 22, color: '#141413' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 17, fontWeight: 700, color: '#141413' }}>Corporation</h3>
            {corpGroups.map((group) => (
              <div key={group} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: '#6B6B68', marginBottom: 8 }}>{group}</div>
                {corpProjects
                  .filter((p) => p.group_name === group)
                  .map((p) => (
                    <ProjectBriefBlock
                      key={p.id}
                      project={p}
                      briefs={briefs.filter((b) => b.project_id === p.id)}
                      onSelectProject={onSelectProject}
                      forceLight
                    />
                  ))}
              </div>
            ))}
            {corpProjects.length === 0 && (
              <div style={{ fontSize: 12.5, color: '#6B6B68' }}>Không tìm thấy dự án Corporation nào.</div>
            )}
          </div>
        </div>
      ) : (
        <div>
          {allSorted.map((p) => (
            <ProjectBriefBlock
              key={p.id}
              project={p}
              briefs={briefs.filter((b) => b.project_id === p.id)}
              onSelectProject={onSelectProject}
            />
          ))}
          {allSorted.length === 0 && (
            <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Không tìm thấy dự án nào khớp.</div>
          )}
        </div>
      )}
    </div>
  );
}
