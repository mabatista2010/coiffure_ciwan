import { supabase } from '@/lib/supabase';

async function getStaffAccessToken(forceRefresh = false): Promise<string> {
  if (forceRefresh) {
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError || !refreshData.session?.access_token) {
      throw new Error('Session admin introuvable');
    }

    return refreshData.session.access_token;
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;

  if (sessionError || !accessToken) {
    throw new Error('Session admin introuvable');
  }

  return accessToken;
}

export async function fetchWithStaffAuth(
  input: RequestInfo | URL,
  init: RequestInit = {},
  retryOnUnauthorized = true
): Promise<Response> {
  const execute = async (accessToken: string) => {
    const headers = new Headers(init.headers || {});
    headers.set('Authorization', `Bearer ${accessToken}`);

    return fetch(input, {
      ...init,
      headers,
    });
  };

  let response = await execute(await getStaffAccessToken(false));
  if (response.status !== 401 || !retryOnUnauthorized) {
    return response;
  }

  response = await execute(await getStaffAccessToken(true));
  return response;
}
