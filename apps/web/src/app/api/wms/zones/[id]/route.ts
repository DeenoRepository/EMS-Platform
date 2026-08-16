import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth-guard';
import { prisma } from '@ems/database';
import { PERMISSIONS } from '@ems/shared';
import { hasPermission } from '@ems/auth';

export const dynamic = 'force-dynamic';

// PATCH /api/wms/zones/[id] - Update a storage zone
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.WMS_NOMENCLATURE_MANAGE)) return forbiddenResponse();

    const body = await req.json();
    const { name, code, description } = body;

    const data: any = {};
    if (name !== undefined) data.name = String(name).trim();
    if (code !== undefined) data.code = String(code).trim().toUpperCase();
    if (description !== undefined) data.description = description ? String(description).trim() : null;

    const updated = await prisma.storageZone.update({
      where: { id: params.id },
      data,
      include: { cells: true },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating storage zone:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// DELETE /api/wms/zones/[id] - Delete a storage zone
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return unauthorizedResponse();
    if (!hasPermission(user, PERMISSIONS.WMS_NOMENCLATURE_MANAGE)) return forbiddenResponse();

    await prisma.storageZone.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true, message: 'Зона успешно удалена' });
  } catch (error) {
    console.error('Error deleting storage zone:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
