import { NextResponse } from 'next/server';

import { requireStaffAuth } from '@/lib/apiAuth';
import {
  findProfileByIdentifiers,
  buildProfilePayload,
  isUniqueViolation,
  type CustomerProfileRow,
} from '@/lib/crmProfiles';
import { normalizeEmail, normalizePhone, parseCustomerKey } from '@/lib/crmCustomerKey';
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin';

function badRequest(code: string, error: string) {
  return NextResponse.json({ code, error }, { status: 400 });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireStaffAuth(request, {
      allowedRoles: ['admin', 'staff'],
      feature: 'crm_customer_profile_get',
      requiredPermission: 'crm.customers.view',
    });
    if ('response' in auth) {
      return auth.response;
    }

    const { id } = await params;
    const parsedKey = parseCustomerKey(id);
    if (!parsedKey) {
      return badRequest('invalid_customer_key', 'Identifiant client invalide');
    }

    const supabase = getSupabaseAdminClient();
    const url = new URL(request.url);
    const customerName = (url.searchParams.get('customerName') || '').trim();
    const customerEmail = normalizeEmail(url.searchParams.get('customerEmail') || '');
    const customerPhone = normalizePhone(url.searchParams.get('customerPhone') || '');

    let profile = await findProfileByIdentifiers(supabase, {
      customerKeyRaw: id,
      customerEmail,
      customerPhone,
    });

    if (!profile) {
      // Lazy create du profil lors de la première ouverture si on a des données client.
      if (customerName || customerEmail || customerPhone) {
        const payload = buildProfilePayload(
          {
            customerName,
            customerEmail,
            customerPhone,
          },
          auth.userId,
          true
        );

        const { data: created, error: createError } = await supabase
          .from('customer_profiles')
          .insert([payload])
          .select('*')
          .single<CustomerProfileRow>();

        if (createError) {
          if (isUniqueViolation(createError)) {
            const recoveredProfile = await findProfileByIdentifiers(supabase, {
              customerKeyRaw: id,
              customerEmail,
              customerPhone,
            });
            if (recoveredProfile) {
              profile = recoveredProfile;
            } else {
              console.error('crm_profile_create_unique_conflict_no_recovery', createError);
              return NextResponse.json(
                { code: 'profile_create_failed', error: 'Impossible de créer le profil client' },
                { status: 500 }
              );
            }
          } else {
            console.error('crm_profile_create_error', createError);
            return NextResponse.json(
              { code: 'profile_create_failed', error: 'Impossible de créer le profil client' },
              { status: 500 }
            );
          }
        } else {
          profile = created;
        }

        if (!profile) {
          console.error('crm_profile_create_error', createError);
          return NextResponse.json(
            { code: 'profile_create_failed', error: 'Impossible de créer le profil client' },
            { status: 500 }
          );
        }
      }
    }

    if (!profile) {
      return NextResponse.json({ profile: null }, { status: 200 });
    }

    // Revalidation defensive: le profil retourné doit correspondre à la clé.
    if (
      (parsedKey.type === 'email' && profile.customer_email !== parsedKey.value) ||
      (parsedKey.type === 'phone' && profile.customer_phone !== parsedKey.value)
    ) {
      return NextResponse.json({ profile: null }, { status: 200 });
    }

    return NextResponse.json({ profile }, { status: 200 });
  } catch (error) {
    console.error('crm_profile_get_unhandled_error', error);
    return NextResponse.json(
      { code: 'internal_error', error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireStaffAuth(request, {
      allowedRoles: ['admin', 'staff'],
      feature: 'crm_customer_profile_update',
      requiredPermission: 'crm.customers.edit',
    });
    if ('response' in auth) {
      return auth.response;
    }

    const { id } = await params;
    const parsedKey = parseCustomerKey(id);
    if (!parsedKey) {
      return badRequest('invalid_customer_key', 'Identifiant client invalide');
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return badRequest('invalid_payload', 'Payload invalide');
    }

    const customerName = typeof body.customerName === 'string' ? body.customerName : '';
    const customerEmail = typeof body.customerEmail === 'string' ? body.customerEmail : '';
    const customerPhone = typeof body.customerPhone === 'string' ? body.customerPhone : '';

    const input = {
      customerName,
      customerEmail,
      customerPhone,
      birthDate: typeof body.birthDate === 'string' ? body.birthDate : null,
      maritalStatus: typeof body.maritalStatus === 'string' ? body.maritalStatus : null,
      hasChildren: typeof body.hasChildren === 'boolean' ? body.hasChildren : null,
      hobbies: typeof body.hobbies === 'string' ? body.hobbies : null,
      occupation: typeof body.occupation === 'string' ? body.occupation : null,
      preferredContactChannel:
        typeof body.preferredContactChannel === 'string' ? body.preferredContactChannel : null,
      marketingConsent: Boolean(body.marketingConsent),
      internalNotesSummary:
        typeof body.internalNotesSummary === 'string' ? body.internalNotesSummary : null,
    };

    const supabase = getSupabaseAdminClient();
    const existing = await findProfileByIdentifiers(supabase, {
      customerKeyRaw: id,
      customerEmail,
      customerPhone,
    });

    try {
      const payload = buildProfilePayload(input, auth.userId, !existing);
      const normalizedEmail = normalizeEmail(customerEmail);
      const normalizedPhone = normalizePhone(customerPhone);

      if (parsedKey.type === 'email' && normalizedEmail && normalizedEmail !== parsedKey.value) {
        return badRequest('key_mismatch', 'L’email ne correspond pas à la clé client');
      }
      if (parsedKey.type === 'phone' && normalizedPhone && normalizedPhone !== parsedKey.value) {
        return badRequest('key_mismatch', 'Le téléphone ne correspond pas à la clé client');
      }

      let profile: CustomerProfileRow | null = null;

      if (!existing) {
        const { data: created, error: createError } = await supabase
          .from('customer_profiles')
          .insert([payload])
          .select('*')
          .single<CustomerProfileRow>();

        if (createError) {
          if (isUniqueViolation(createError)) {
            const recoveredProfile = await findProfileByIdentifiers(supabase, {
              customerKeyRaw: id,
              customerEmail,
              customerPhone,
            });
            if (!recoveredProfile) {
              console.error('crm_profile_insert_unique_conflict_no_recovery', createError);
              return NextResponse.json(
                { code: 'profile_insert_failed', error: 'Impossible de créer le profil client' },
                { status: 500 }
              );
            }

            const { data: updated, error: updateAfterConflictError } = await supabase
              .from('customer_profiles')
              .update(payload)
              .eq('id', recoveredProfile.id)
              .select('*')
              .single<CustomerProfileRow>();

            if (updateAfterConflictError) {
              console.error('crm_profile_update_after_conflict_error', updateAfterConflictError);
              return NextResponse.json(
                { code: 'profile_update_failed', error: 'Impossible de mettre à jour le profil client' },
                { status: 500 }
              );
            }

            profile = updated;
          } else {
            console.error('crm_profile_insert_error', createError);
            return NextResponse.json(
              { code: 'profile_insert_failed', error: 'Impossible de créer le profil client' },
              { status: 500 }
            );
          }
        } else {
          profile = created;
        }

        if (!profile) {
          console.error('crm_profile_insert_error', createError);
          return NextResponse.json(
            { code: 'profile_insert_failed', error: 'Impossible de créer le profil client' },
            { status: 500 }
          );
        }
      } else {
        const { data: updated, error: updateError } = await supabase
          .from('customer_profiles')
          .update(payload)
          .eq('id', existing.id)
          .select('*')
          .single<CustomerProfileRow>();

        if (updateError) {
          console.error('crm_profile_update_error', updateError);
          return NextResponse.json(
            { code: 'profile_update_failed', error: 'Impossible de mettre à jour le profil client' },
            { status: 500 }
          );
        }
        profile = updated;
      }

      return NextResponse.json({ profile }, { status: 200 });
    } catch (validationError) {
      const message = validationError instanceof Error ? validationError.message : 'validation_error';
      if (message === 'invalid_birth_date') {
        return badRequest('invalid_birth_date', 'Date de naissance invalide');
      }
      if (message === 'birth_date_in_future') {
        return badRequest('birth_date_in_future', 'La date de naissance ne peut pas être dans le futur');
      }
      return badRequest('invalid_payload', 'Payload invalide');
    }
  } catch (error) {
    console.error('crm_profile_put_unhandled_error', error);
    return NextResponse.json(
      { code: 'internal_error', error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
