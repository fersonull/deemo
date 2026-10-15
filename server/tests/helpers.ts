// Opt-in integration tests: real Firebase Auth (disposable *@deemo.test users) and a real Postgres (use a test
// database: DATABASE_URL), fake Gemini. Each test removes exactly the users it created; deleting the user row
// cascades to everything of theirs.

export async function startServer() {
  const { app } = await import("../src/app");
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  return { base, close: () => new Promise<void>((resolve) => server.close(() => resolve())) };
}

const realFetch = globalThis.fetch;

// Gemini never answers for real: Flash calls fail as "busy" (so no AI credit is spent), token mints use `mint`.
export function fakeGemini(mint: (body: any) => Response) {
  globalThis.fetch = (async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
    const url = String(input);
    if (url === "https://generativelanguage.googleapis.com/v1beta/auth_tokens") return mint(JSON.parse(String(init?.body)));
    if (url.startsWith("https://generativelanguage.googleapis.com/")) return Response.json({ error: "fixture" }, { status: 503 });
    return realFetch(input, init);
  }) as typeof fetch;
  return () => (globalThis.fetch = realFetch);
}

// A verified Firebase user with consent on record, and an ID token for it.
export async function createStudent(name: string, opts: { premium?: boolean } = {}) {
  const { getAuth } = await import("../src/shared/auth/firebase");
  const { prisma } = await import("../src/shared/prisma");
  const config = await Bun.file("../client/mobile/Deemo/google-services.json").json();
  const key = config.client[0].api_key[0].current_key;
  const user = await getAuth().createUser({ email: `${name.toLowerCase()}-${crypto.randomUUID()}@deemo.test`, displayName: name, emailVerified: true });
  const signIn = await realFetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${key}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token: await getAuth().createCustomToken(user.uid), returnSecureToken: true }),
  });
  const { idToken } = (await signIn.json()) as { idToken?: string };
  if (!idToken) throw new Error(`Fixture sign-in failed (${signIn.status})`);
  await prisma.user.create({
    data: { id: user.uid, email: user.email!, name, emailVerified: true, premium: opts.premium ?? false, consentVersion: "test", consentAt: new Date() },
  });
  return { uid: user.uid, token: idToken };
}

export async function removeStudent(uid: string) {
  const { getAuth } = await import("../src/shared/auth/firebase");
  const { prisma } = await import("../src/shared/prisma");
  await prisma.user.deleteMany({ where: { id: uid } });
  await getAuth()
    .deleteUser(uid)
    .catch((e: { code?: string }) => {
      if (e.code !== "auth/user-not-found") throw e;
    });
}

export function client(base: string) {
  return async (token: string | null, path: string, method = "GET", body?: object) => {
    const r = await realFetch(base + path, {
      method,
      headers: { "content-type": "application/json", ...(token && { authorization: `Bearer ${token}` }) },
      ...(body && { body: JSON.stringify(body) }),
    });
    return { status: r.status, body: (await r.json().catch(() => null)) as any };
  };
}

export const ANALYSIS = {
  title: "Group fixture",
  problem: "Test access",
  objectives: "Keep sessions private",
  method: "Integration testing",
  scope: "Fixture",
  features: "Join",
  limits: "Test only",
  results: "",
  facts: ["No real student data"],
  unsure: [],
};

// A confirmed manuscript, written straight to the database (no upload, no AI).
export async function createProject(uid: string) {
  const { prisma } = await import("../src/shared/prisma");
  const id = crypto.randomUUID();
  await prisma.project.create({
    data: {
      id,
      userId: uid,
      name: "Disposable group manuscript",
      domain: "Data & AI",
      fileName: "fixture.pdf",
      sizeBytes: 1,
      status: "ready",
      confirmedAt: new Date(),
      analysis: { create: ANALYSIS },
    },
  });
  return id;
}
