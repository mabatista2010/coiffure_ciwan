import { fetchWithStaffAuth } from '@/lib/fetchWithStaffAuth';

export type AdminCustomerSearchResult = {
  customer_key: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  last_visit_date: string | null;
  total_visits: number;
  total_spent: number;
  source: 'profile' | 'booking' | 'mixed';
};

type AdminCustomerSearchResponse = {
  customers?: AdminCustomerSearchResult[];
  total?: number;
  error?: string;
  code?: string;
};

export async function searchAdminCustomers(
  query: string,
  options: { limit?: number; signal?: AbortSignal } = {}
): Promise<{ customers: AdminCustomerSearchResult[]; total: number }> {
  const safeQuery = query.trim();
  if (safeQuery.length < 2) {
    return { customers: [], total: 0 };
  }

  const params = new URLSearchParams({
    q: safeQuery,
    limit: String(options.limit ?? 8),
  });

  const response = await fetchWithStaffAuth(`/api/admin/crm/customers/search?${params.toString()}`, {
    method: 'GET',
    signal: options.signal,
  });

  const payload = (await response.json().catch(() => ({}))) as AdminCustomerSearchResponse;

  if (!response.ok) {
    throw new Error(payload.error || 'Impossible de rechercher les clients');
  }

  return {
    customers: payload.customers || [],
    total: payload.total || 0,
  };
}
