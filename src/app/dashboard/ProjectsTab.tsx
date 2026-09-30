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
        <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>D