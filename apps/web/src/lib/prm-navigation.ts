export function buildPrmRequestDeepLink(requestId: string): string {
  const normalizedId = requestId.trim();
  if (!normalizedId) {
    throw new Error('PRM request ID is required');
  }

  return `/prm?requestId=${encodeURIComponent(normalizedId)}`;
}
