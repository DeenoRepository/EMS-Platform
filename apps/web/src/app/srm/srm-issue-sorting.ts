export interface SrmSortableIssue {
  key: string;
  title: string;
  status: string;
  priority: string;
  failureCategory: string | null;
  source: string;
  createdAt: string;
  equipment?: { name: string } | null;
  reportedBy?: { displayName: string } | null;
}

export function sortSrmIssues<T extends SrmSortableIssue>(
  issues: T[],
  sortField: string,
  sortDirection: 'asc' | 'desc'
): T[] {
  const list = [...issues];
  list.sort((a, b) => {
    const valueA = getSortValue(a, sortField);
    const valueB = getSortValue(b, sortField);
    if (valueA < valueB) return sortDirection === 'asc' ? -1 : 1;
    if (valueA > valueB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });
  return list;
}

function getSortValue(issue: SrmSortableIssue, sortField: string): string | number {
  if (sortField === 'equipment') return issue.equipment?.name || '';
  if (sortField === 'reportedBy') return issue.reportedBy?.displayName || '';
  if (sortField === 'createdAt') return new Date(issue.createdAt).getTime();
  return issue[sortField as keyof SrmSortableIssue] as string;
}
