export function countActiveStockFilters(
  selectedWarehouse: string,
  selectedZone: string,
  selectedCategory: string,
  search: string,
  lowStockOnly: boolean
): number {
  return (
    (selectedWarehouse ? 1 : 0) +
    (selectedZone ? 1 : 0) +
    (selectedCategory ? 1 : 0) +
    (search ? 1 : 0) +
    (lowStockOnly ? 1 : 0)
  );
}
