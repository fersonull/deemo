import { getAuth, getIdToken } from "@react-native-firebase/auth";

import { API_URL } from "@/constants";

// Every DEEMO server call carries the student's Firebase ID token (server/src/firebase.ts requireUser);
// the SDK refreshes it before it expires.
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const user = getAuth().currentUser;
  const token = user ? await getIdToken(user) : null;
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { ...(init.headers as Record<string, string>), ...(token && { authorization: `Bearer ${token}` }) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error ?? `Request failed (${res.status})`);
  return body as T;
}
