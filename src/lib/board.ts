import type { Project } from './types';

// Dự án có bảng riêng (tab Q6 / Q9). Bấm tên dự án hoặc đầu việc của 2 dự án này ở bất kỳ đâu
// (Dashboard, Dự án, Văn phòng, thông báo…) sẽ nhảy thẳng sang tab tương ứng.
export type BoardKey = 'q6' | 'q9';

export function boardKeyOf(p: Pick<Project, 'title'> | null | undefined): BoardKey | null {
  const t = (p?.title || '').trim().toUpperCase();
  if (t === 'Q6') return 'q6';
  if (t === 'Q9') return 'q9';
  return null;
}

export const BOARD_SECTIONS: Record<BoardKey, string[]> = {
  q9: ['TVC FULL', 'TEASER'],
  q6: ['TVC FULL', 'TEASER', 'ẢNH RENDER']
};
