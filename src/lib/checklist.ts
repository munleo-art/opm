export function defaultChecklistTemplate() {
  return [
    { label: 'Đang triển khai', item_group: 'start', sort_order: 0 },
    { label: 'Duyệt kịch bản v1', item_group: 'script', sort_order: 1 },
    { label: 'Check bản dựng TVC v1', item_group: 'build', sort_order: 2 },
    { label: 'Hoàn thành', item_group: 'end', sort_order: 3 }
  ];
}

export function defaultDungPhimChecklistTemplate() {
  return [
    { label: 'Dựng v1', item_group: 'dung', sort_order: 0 },
    { label: 'Dựng v2', item_group: 'dung', sort_order: 1 },
    { label: 'Hoàn thiện', item_group: 'end', sort_order: 2 }
  ];
}

export function computeTaskProgress(items: { checked: boolean }[]): number {
  if (!items || items.length === 0) return 0;
  const checkedCount = items.filter((i) => i.checked).length;
  return Math.round((checkedCount / items.length) * 100);
}

export function computeNextLabel(
  items: { label: string; item_group: string }[],
  group: string,
  baseLabel: string
) {
  let maxNum = 0;
  items
    .filter((i) => i.item_group === group)
    .forEach((i) => {
      const m = i.label.match(/v(\d+)$/);
      if (m) {
        const n = parseInt(m[1], 10);
        if (n > maxNum) maxNum = n;
      }
    });
  return `${baseLabel} v${maxNum + 1}`;
}
