import { fetchWithStaffAuth } from '@/lib/fetchWithStaffAuth';
import type { StaffAccessContext } from '@/lib/permissions/types';

export async function fetchCurrentStaffAccessContext(): Promise<StaffAccessContext> {
  const response = await fetchWithStaffAuth('/api/admin/access-context');
  const json = await response.json().catch(() => ({}));

  if (!response.ok || !json.context) {
    throw new Error(json.error || 'Impossible de charger le contexte d acces');
  }

  return json.context as StaffAccessContext;
}
