import { NextResponse } from 'next/server';

import { requireStaffAuth } from '@/lib/apiAuth';
import {
  buildProfilePayload,
  findProfileByCustomerKey,
  isUniqueViolation,
  type CustomerProfileRow,
} from '@/lib/crmProfiles';
import { normalizeEmail, normalizePhone, parseCustomerKey } from '@/lib/crmCustomerKey';
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin';

type CustomerNoteRow = {
  id: string;
  customer_profile_id: string;
  note: string;
  note_type: string;
  created_at: string;
  created_by: string;
};

function badRequest(code: string, error: string) {
  return NextResponse.json({ code, error }, { status: 400 });
}

async function ensureProfile(
  request: Request,
  customerKeyRaw: string,
  userId: string
): Promise<CustomerProfileRow | null> {
  const supabase = getSupabaseAdminClient();
  const existing = await findProfileByCustomerKey(supabase, customerKeyRaw);
  if (existing) return existing;

  const parsedKey = parseCustomerKey(customerKeyRaw);
  if (!parsedKey) return null;

  let customerName = '';
  let customerEmail = '';
  let customerPhone = '';

  if (request.method === 'GET') {
    const url = new URL(request.url);
    customerName = (url.searchParams.get('customerName') || '').trim();
    customerEmail = normalizeEmail(url.searchParams.get('customerEmail') || '');
    customerPhone = normalizePhone(url.searchParams.get('customerPhone') || '');
  } else {
    const body = await request.clone().json().catch(() => ({}));
    customerName = typeof body.customerName === 'string' ? body.customerName.trim() : '';
    customerEmail = typeof body.customerEmail === 'string' ? normalizeEmail(body.customerEmail) : '';
    customerPhone = typeof body.customerPhone === 'string' ? normalizePhone(body.customerPhone) : '';
  }

  if (parsedKey.type === 'email' && !customerEmail) {
    customerEmail = parsedKey.value;
  }
  if (parsedKey.type === 'phone' && !customerPhone) {
    customerPhone = parsedKey.value;
  }

  if (!customerName && !customerEmail && !customerPhone) {
    return null;
  }

  const payload = buildProfilePayload(
    {
      customerName,
      customerEmail,
      customerPhone,
    },
    userId,
    true
  );

  const { data: created, error: createError } = await supabase
    .from('customer_profiles')
    .insert([payload])
    .select('*')
    .single<CustomerProfileRow>();

  if (createError) {
    if (isUniqueViolation(createError)) {
      const recoveredProfile = await findProfileByCustomerKey(supabase, customerKeyRaw);
      if (recoveredProfile) {
        return recoveredProfile;
      }
    }

    console.error('crm_profile_lazy_create_error', createError);
    throw createError;
  }

  return created;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireStaffAuth(request, {
      allowedRoles: ['admin', 'staff'],
      feature: 'crm_customer_notes_get',
      requiredPermission: 'crm.notes.view',
    });
    if ('response' in auth) {
      return auth.response;
    }

    const { id } = await params;
    if (!parseCustomerKey(id)) {
      return badRequest('invalid_customer_key', 'Identifiant client invalide');
    }

    const profile = await ensureProfile(request, id, auth.userId);
    if (!profile) {
      return NextResponse.json({ notes: [] }, { status: 200 });
    }

    const supabase = getSupabaseAdminClient();
    const { data: notes, error } = await supabase
      .from('customer_notes')
      .select('*')
      .eq('customer_profile_id', profile.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('crm_notes_get_error', error);
      return NextResponse.json(
        { code: 'notes_fetch_failed', error: 'Impossible de récupérer les notes client' },
        { status: 500 }
      );
    }

    return NextResponse.json({ notes: notes || [] }, { status: 200 });
  } catch (error) {
    console.error('crm_notes_get_unhandled_error', error);
    return NextResponse.json(
      { code: 'internal_error', error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireStaffAuth(request, {
      allowedRoles: ['admin', 'staff'],
      feature: 'crm_customer_notes_create',
      requiredPermission: 'crm.notes.create',
    });
    if ('response' in auth) {
      return auth.response;
    }

    const { id } = await params;
    if (!parseCustomerKey(id)) {
      return badRequest('invalid_customer_key', 'Identifiant client invalide');
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return badRequest('invalid_payload', 'Payload invalide');
    }

    const note = typeof body.note === 'string' ? body.note.trim() : '';
    if (!note) {
      return badRequest('empty_note', 'La note ne peut pas être vide');
    }
    if (note.length > 4000) {
      return badRequest('note_too_long', 'La note ne peut pas dépasser 4000 caractères');
    }

    const noteType = typeof body.noteType === 'string' ? body.noteType.trim() : 'general';
    const allowedTypes = ['general', 'follow_up', 'incident', 'preference'];
    if (!allowedTypes.includes(noteType)) {
      return badRequest('invalid_note_type', 'Type de note invalide');
    }

    const profile = await ensureProfile(request, id, auth.userId);
    if (!profile) {
      return badRequest('profile_not_found', 'Profil client introuvable');
    }

    const supabase = getSupabaseAdminClient();
    const { data: created, error } = await supabase
      .from('customer_notes')
      .insert([
        {
          customer_profile_id: profile.id,
          note,
          note_type: noteType,
          created_by: auth.userId,
        },
      ])
      .select('*')
      .single<CustomerNoteRow>();

    if (error) {
      console.error('crm_note_create_error', error);
      return NextResponse.json(
        { code: 'note_create_failed', error: 'Impossible de créer la note client' },
        { status: 500 }
      );
    }

    return NextResponse.json({ note: created }, { status: 201 });
  } catch (error) {
    console.error('crm_notes_post_unhandled_error', error);
    return NextResponse.json(
      { code: 'internal_error', error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
