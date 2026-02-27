export type CustomerKeyType = 'email' | 'phone';

export type ParsedCustomerKey = {
  type: CustomerKeyType;
  value: string;
};

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizePhone(phone: string): string {
  const trimmed = phone.trim();
  if (!trimmed) return '';

  const hasPlusPrefix = trimmed.startsWith('+');
  const digits = trimmed.replace(/[^0-9]/g, '');

  if (!digits) return '';
  return hasPlusPrefix ? `+${digits}` : digits;
}

export function buildCustomerKey(email?: string | null, phone?: string | null): string | null {
  const normalizedEmail = normalizeEmail(email || '');
  if (normalizedEmail) {
    return `email:${normalizedEmail}`;
  }

  const normalizedPhone = normalizePhone(phone || '');
  if (normalizedPhone) {
    return `phone:${normalizedPhone}`;
  }

  return null;
}

export function parseCustomerKey(rawKey: string): ParsedCustomerKey | null {
  const key = decodeURIComponent(rawKey || '').trim();
  if (!key) return null;

  const separatorIndex = key.indexOf(':');
  if (separatorIndex <= 0) return null;

  const rawType = key.slice(0, separatorIndex);
  const rawValue = key.slice(separatorIndex + 1);
  if (!rawValue) return null;

  if (rawType === 'email') {
    return { type: 'email', value: normalizeEmail(rawValue) };
  }

  if (rawType === 'phone') {
    return { type: 'phone', value: normalizePhone(rawValue) };
  }

  return null;
}
