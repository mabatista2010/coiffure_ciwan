import { NextResponse } from 'next/server';

import { requireStaffAuth } from '@/lib/apiAuth';
import { getStaffAccessContext } from '@/lib/permissions/server';

export async function GET(request: Request) {
  const auth = await requireStaffAuth(request, {
    allowedRoles: ['admin', 'staff'],
    feature: 'access_context',
  });

  if ('response' in auth) {
    return auth.response;
  }

  const context = await getStaffAccessContext(auth.userId);
  if (!context) {
    return NextResponse.json(
      { error: 'Contexte de permissions introuvable', code: 'access_context_not_found' },
      { status: 404 }
    );
  }

  return NextResponse.json({ context }, { status: 200 });
}
