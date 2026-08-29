export function countActiveInventoryFilters(
  search: string,
  selectedWarehouse: string,
  selectedStatus: string
): number {
  return (search ? 1 : 0) + (selectedWarehouse ? 1 : 0) + (selectedStatus ? 1 : 0);
}
