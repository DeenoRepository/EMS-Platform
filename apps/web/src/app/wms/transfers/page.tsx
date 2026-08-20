'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageLoading } from '@/components/ui';

export default function WmsTransfersRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/wms/operations?tab=transfers');
  }, [router]);

  return <PageLoading text="Перенаправление в раздел перемещений..." />;
}
