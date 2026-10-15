import { getAuth, getIdToken } from "@react-native-firebase/auth";

import { API_URL } from "@/constants";

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

// Why the last server call failed, in plain words, for the offline screen's small print (null after a success).
// Release builds have no console, so this is how a student (or we) can tell a dead network from a stale sign-in.
let lastFailure: string | null = null;
export const lastApiFailure = () => lastFailure;

// The student's Firebase ID token. Opened offline with an expired token, the SDK's refresh fails; once back online
// the first attempt can still fail on the stale state, so a failure is retried once with a forced refresh.
async function token(force: boolean) {
  const user = getAuth().currentUser;
  if (!user) return null;
  try {
    return await getIdToken(user, force);
  } catch (e) {
    if (force) throw new ApiError(`Sign-in token: ${e instanceof Error ? e.message : String(e)}`, 0);
    return token(true);
  }
}

// Every DEEMO server call carries the student's Firebase ID token (server/src/shared/auth/authenticate.ts);
// the SDK refreshes it before it expires. A 401 gets one more try with a freshly minted token.
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  try {
    const body = await call<T>(path, init, false).catch((e) =>
      e instanceof ApiError && e.status === 401 ? call<T>(path, init, true) : Promise.reject(e),
    );
    lastFailure = null;
    return body;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const status = e instanceof ApiError && e.status ? ` (${e.status})` : "";
    lastFailure = message.endsWith(status) ? message : message + status;
    throw e;
  }
}

async function call<T>(path: string, init: RequestInit, force: boolean): Promise<T> {
  const t = await token(force);
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { ...(init.headers as Record<string, string>), ...(t && { authorization: `Bearer ${t}` }) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError((body as { error?: string }).error ?? `Request failed (${res.status})`, res.status);
  return body as T;
}
