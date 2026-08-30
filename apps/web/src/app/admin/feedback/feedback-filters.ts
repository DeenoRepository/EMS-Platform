export interface FeedbackFilterState {
  searchQuery: string;
  filterType: string;
  filterModule: string;
  filterStatus: string;
  filterPriority: string;
}

export function countActiveFeedbackFilters(filters: FeedbackFilterState) {
  return [filters.filterType, filters.filterModule, filters.filterStatus, filters.filterPriority]
    .filter((value) => value !== 'ALL')
    .length;
}

export function buildFeedbackQueryParams(filters: FeedbackFilterState, page: number, rowsPerPage: number) {
  const params = new URLSearchParams({ limit: String(rowsPerPage), offset: String(page * rowsPerPage) });
  if (filters.filterType !== 'ALL') params.set('type', filters.filterType);
  if (filters.filterModule !== 'ALL') params.set('module', filters.filterModule);
  if (filters.filterStatus !== 'ALL') params.set('status', filters.filterStatus);
  if (filters.filterPriority !== 'ALL') params.set('priority', filters.filterPriority);
  if (filters.searchQuery.trim()) params.set('search', filters.searchQuery.trim());
  return params;
}
