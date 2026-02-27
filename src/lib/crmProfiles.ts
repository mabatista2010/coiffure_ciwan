import type { SupabaseClient } from '@supabase/supabase-js';

import { normalizeEmail, normalizePhone, parseCustomerKey } from '@/lib/crmCustomerKey';

export type CustomerProfileRow = {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  birth_date: string | null;
  marital_status: string | null;
  has_children: boolean | null;
  hobbies: string | null;
  occupation: string | null;
  preferred_contact_channel: string | null;
  marketing_consent: boolean;
  internal_notes_summary: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
};

export type CustomerProfileInput = {
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  birthDate?: string | null;
  maritalStatus?: string | null;
  hasChildren?: boolean | null;
  hobbies?: string | null;
  occupation?: string | null;
  preferredContactChannel?: string | null;
  marketingConsent?: boolean;
  internalNotesSummary?: string | null;
};

export function isUniqueViolation(error: { code?: string } | null | undefined): boolean {
  return error?.code === '23505';
}

export async function findProfileByCustomerKey(
  supabase: SupabaseClient,
  customerKeyRaw: string
): Promise<CustomerProfileRow | null> {
  const key = parseCustomerKey(customerKeyRaw);
  if (!key) return null;

  let query = supabase
    .from('customer_profiles')
    .select('*')
    .limit(1);

  if (key.type === 'email') {
    query = query.eq('customer_email', key.value);
  } else {
    query = query.eq('customer_phone', key.value);
  }

  const { data, error } = await query.maybeSingle<CustomerProfileRow>();
  if (error) {
    throw error;
  }

  return data ?? null;
}

export function sanitizeProfileInput(input: CustomerProfileInput): CustomerProfileInput {
  const birthDate = input.birthDate ? input.birthDate.trim() : null;
  if (birthDate) {
    const parsed = new Date(`${birthDate}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error('invalid_birth_date');
    }
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (parsed > todayStart) {
      throw new Error('birth_date_in_future');
    }
  }

  return {
    customerName: (input.customerName || '').trim(),
    customerEmail: normalizeEmail(input.customerEmail || ''),
    customerPhone: normalizePhone(input.customerPhone || ''),
    birthDate: birthDate || null,
    maritalStatus: (input.maritalStatus || '').trim() || null,
    hasChildren:
      typeof input.hasChildren === 'boolean' ? input.hasChildren : input.hasChildren === null ? null : null,
    hobbies: (input.hobbies || '').trim() || null,
    occupation: (input.occupation || '').trim() || null,
    preferredContactChannel: (input.preferredContactChannel || '').trim() || null,
    marketingConsent: Boolean(input.marketingConsent),
    internalNotesSummary: (input.internalNotesSummary || '').trim() || null,
  };
}

export function buildProfilePayload(
  input: CustomerProfileInput,
  userId: string,
  isCreate: boolean
): Record<string, unknown> {
  const sanitized = sanitizeProfileInput(input);
  const nowIso = new Date().toISOString();

  return {
    customer_name: sanitized.customerName || '',
    customer_email: sanitized.customerEmail || '',
    customer_phone: sanitized.customerPhone || '',
    birth_date: sanitized.birthDate,
    marital_status: sanitized.maritalStatus,
    has_children: sanitized.hasChildren,
    hobbies: sanitized.hobbies,
    occupation: sanitized.occupation,
    preferred_contact_channel: sanitized.preferredContactChannel,
    marketing_consent: sanitized.marketingConsent,
    internal_notes_summary: sanitized.internalNotesSummary,
    updated_at: nowIso,
    updated_by: userId,
    ...(isCreate ? { created_at: nowIso, created_by: userId } : {}),
  };
}
