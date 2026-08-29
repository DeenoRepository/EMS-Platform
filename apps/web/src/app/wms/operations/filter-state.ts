export function countActiveOperationFilters(
  selectedType: string,
  selectedWarehouse: string,
  opsSearch: string
): number {
  return (selectedType ? 1 : 0) + (selectedWarehouse ? 1 : 0) + (opsSearch ? 1 : 0);
}
