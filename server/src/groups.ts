import { randomInt } from "node:crypto";
import type { UserRecord } from "firebase-admin/auth";
import { db, getAuth } from "./firebase";
import { DEFAULT_WEIGHTS } from "./scoring";
import { defaultAvatar, store, type Project } from "./store";

type Member = { uid: string; name: string; shareScore: boolean; focusArea: string };
type Group = { code: string; ownerUid: string; projectId: string; members: Member[]; memberIds: string[] };
export type GroupInfo = { code: string; isOwner: boolean; shareScore: boolean; focusArea: string };
export type SharedProject = Project & { group?: GroupInfo };
export class GroupError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
const groups = db.collection("groups");
const userRef = (uid: string) => db.collection("users").doc(uid);
const memberships = (uid: string) => groups.where("memberIds", "array-contains", uid);
const CODE = /^[A-HJ-NP-Z2-9]{6}$/;
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const newCode = () => Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
export const validWeights = (w: unknown): w is number[] =>
  Array.isArray(w) &&
  w.length === 5 &&
  w.every((n) => Number.isInteger(n) && n >= 0 && n <= 60 && n % 5 === 0) &&
  w.reduce((a, b) => a + b, 0) === 100;
const unavailable = () => new GroupError(404, "This group project is no longer available.");
const activeUser = (data: FirebaseFirestore.DocumentData | undefined) => {
  if (data?.deleting) throw new GroupError(403, "This account is being deleted.");
};
function decorate(p: Project, g: Group, uid: string): SharedProject {
  const m = g.members.find((m) => m.uid === uid);
  if (!m) throw unavailable();
  return {
    ...p,
    id: g.ownerUid === uid ? p.id : `group-${g.code}`,
    weights: p.weights ?? DEFAULT_WEIGHTS,
    group: { code: g.code, isOwner: g.ownerUid === uid, shareScore: m.shareScore, focusArea: m.focusArea },
  };
}

export async function listProjects(uid: string): Promise<SharedProject[]> {
  const [own, joined] = await Promise.all([store.list(uid), memberships(uid).get()]);
  const list: SharedProject[] = [...own];
  for (const doc of joined.docs) {
    const g = doc.data() as Group;
    const p = await store.get(g.ownerUid, g.projectId);
    if (!p) continue;
    const shared = decorate(p, g, uid);
    const index = list.findIndex((p) => p.id === shared.id);
    if (index >= 0) list[index] = shared;
    else list.push(shared);
  }
  return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function accessibleProject(uid: string, id: string): Promise<SharedProject | null> {
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(id)) return null;
  if (id.startsWith("group-")) {
    const code = id.slice(6);
    if (!CODE.test(code)) return null;
    const g = (await groups.doc(code).get()).data() as Group | undefined;
    if (!g?.memberIds.includes(uid)) return null;
    const p = await store.get(g.ownerUid, g.projectId);
    return p ? decorate(p, g, uid) : null;
  }
  const p = await store.get(uid, id);
  if (!p) return null;
  const joined = await memberships(uid).get();
  const g = joined.docs.map((d) => d.data() as Group).find((g) => g.ownerUid === uid && g.projectId === id);
  return g ? decorate(p, g, uid) : p;
}

// Both uploads and joins lock the account record, so simultaneous requests cannot exceed the free slot.
export async function reserveProject(uid: string, project: Project) {
  await db.runTransaction(async (tx) => {
    const account = await tx.get(userRef(uid));
    activeUser(account.data());
    const own = await tx.get(userRef(uid).collection("projects"));
    const joined = await tx.get(memberships(uid));
    const count =
      own.docs.filter((d) => d.data().status !== "failed").length + joined.docs.filter((d) => d.data().ownerUid !== uid).length;
    if (!account.data()?.premium && count >= 1)
      throw new GroupError(403, "The free plan holds one manuscript, including joined projects. Delete or leave it first.");
    tx.set(userRef(uid), { projectsChangedAt: Date.now() }, { merge: true });
    tx.create(userRef(uid).collection("projects").doc(project.id), project);
  });
  return project;
}

export async function createGroup(uid: string, projectId: string, name: string) {
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(projectId) || projectId.startsWith("group-")) throw unavailable();
  // A random collision is retried without overwriting an existing invitation.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newCode();
    const result = await db.runTransaction(async (tx) => {
      const account = await tx.get(userRef(uid));
      activeUser(account.data());
      const project = await tx.get(userRef(uid).collection("projects").doc(projectId));
      const joined = await tx.get(memberships(uid));
      const existing = joined.docs.map((d) => d.data() as Group).find((g) => g.ownerUid === uid && g.projectId === projectId);
      if (existing) return existing.code;
      if (!project.data()?.confirmedAt || !project.data()?.analysis)
        throw new GroupError(400, "Review the manuscript summary before sharing it.");
      if ((await tx.get(groups.doc(code))).exists) return null;
      tx.create(groups.doc(code), {
        code,
        ownerUid: uid,
        projectId,
        memberIds: [uid],
        members: [{ uid, name, shareScore: false, focusArea: "" }],
      } satisfies Group);
      tx.set(userRef(uid), { projectsChangedAt: Date.now() }, { merge: true });
      return code;
    });
    if (result) return accessibleProject(uid, projectId);
  }
  throw new GroupError(503, "Couldn't create a code. Try again.");
}

export async function joinGroup(uid: string, rawCode: unknown, name: string) {
  if (typeof rawCode !== "string" || !CODE.test(rawCode.trim().toUpperCase()))
    throw new GroupError(400, "Enter the six-character group code.");
  const code = rawCode.trim().toUpperCase();
  // Persist attempts before checking the code; unsuccessful guesses are limited too, across server restarts.
  await db.runTransaction(async (tx) => {
    const account = await tx.get(userRef(uid));
    activeUser(account.data());
    const since = Number(account.data()?.groupJoinWindow ?? 0);
    const attempts = Date.now() - since < 60_000 ? Number(account.data()?.groupJoinAttempts ?? 0) : 0;
    if (attempts >= 10) throw new GroupError(429, "Too many code attempts. Wait a minute and try again.");
    tx.set(userRef(uid), { groupJoinWindow: attempts ? since : Date.now(), groupJoinAttempts: attempts + 1 }, { merge: true });
  });
  let projectId = "";
  await db.runTransaction(async (tx) => {
    const account = await tx.get(userRef(uid));
    activeUser(account.data());
    const g = (await tx.get(groups.doc(code))).data() as Group | undefined;
    if (!g) throw new GroupError(404, "That code didn't match a group. Check it with your leader.");
    const project = await tx.get(userRef(g.ownerUid).collection("projects").doc(g.projectId));
    if (!project.exists) throw unavailable();
    projectId = g.ownerUid === uid ? g.projectId : `group-${code}`;
    if (g.memberIds.includes(uid)) return;
    if (g.members.length >= 20) throw new GroupError(409, "This group is full (20 members).");
    const own = await tx.get(userRef(uid).collection("projects"));
    const joined = await tx.get(memberships(uid));
    if (!account.data()?.premium && (own.docs.some((d) => d.data().status !== "failed") || !joined.empty))
      throw new GroupError(403, "The free plan holds one manuscript, including joined projects. Delete or leave it first.");
    tx.update(groups.doc(code), {
      memberIds: [...g.memberIds, uid],
      members: [...g.members, { uid, name, shareScore: false, focusArea: "" }],
    });
    tx.set(userRef(uid), { projectsChangedAt: Date.now() }, { merge: true });
  });
  return accessibleProject(uid, projectId);
}

export async function updateMember(uid: string, code: string, body: unknown) {
  if (!CODE.test(code)) throw unavailable();
  const b = (body ?? {}) as Record<string, unknown>;
  if (b.shareScore !== undefined && typeof b.shareScore !== "boolean")
    throw new GroupError(400, "shareScore must be true or false.");
  if (b.focusArea !== undefined && (typeof b.focusArea !== "string" || b.focusArea.length > 160))
    throw new GroupError(400, "Keep your focus area under 160 characters.");
  await db.runTransaction(async (tx) => {
    const g = (await tx.get(groups.doc(code))).data() as Group | undefined;
    if (!g?.memberIds.includes(uid)) throw unavailable();
    tx.update(groups.doc(code), {
      members: g.members.map((m) =>
        m.uid !== uid
          ? m
          : {
              ...m,
              ...(typeof b.shareScore === "boolean" && { shareScore: b.shareScore }),
              ...(typeof b.focusArea === "string" && { focusArea: b.focusArea.trim() }),
            },
      ),
    });
  });
}

export async function leaveGroup(uid: string, code: string) {
  if (!CODE.test(code)) throw unavailable();
  await db.runTransaction(async (tx) => {
    const g = (await tx.get(groups.doc(code))).data() as Group | undefined;
    if (!g?.memberIds.includes(uid)) throw unavailable();
    if (g.ownerUid === uid) tx.delete(groups.doc(code));
    else
      tx.update(groups.doc(code), {
        memberIds: g.memberIds.filter((id) => id !== uid),
        members: g.members.filter((m) => m.uid !== uid),
      });
  });
}

export async function removeProject(uid: string, id: string) {
  if (id.startsWith("group-")) return leaveGroup(uid, id.slice(6));
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(id)) throw unavailable();
  await db.runTransaction(async (tx) => {
    // The owner account lock also prevents concurrent createGroup from reviving an invitation.
    await tx.get(userRef(uid));
    const joined = await tx.get(memberships(uid));
    for (const doc of joined.docs) if (doc.data().ownerUid === uid && doc.data().projectId === id) tx.delete(doc.ref);
    tx.delete(userRef(uid).collection("projects").doc(id));
    tx.set(userRef(uid), { projectsChangedAt: Date.now() }, { merge: true });
  });
}

export async function removeMemberships(uid: string) {
  await userRef(uid).set({ deleting: true }, { merge: true });
  const joined = await memberships(uid).get();
  for (const d of joined.docs)
    await leaveGroup(uid, d.id).catch((e) => {
      if (!(e instanceof GroupError && e.status === 404)) throw e;
    });
}

export async function groupReadiness(uid: string) {
  const joined = await memberships(uid).get();
  return Promise.all(
    joined.docs.map(async (doc) => {
      const g = doc.data() as Group;
      const project = await store.get(g.ownerUid, g.projectId);
      // Current names, so a name set after joining (Profile) shows up; the one saved at join is the fallback.
      const { users } = await getAuth()
        .getUsers(g.members.map((m) => ({ uid: m.uid })))
        .catch(() => ({ users: [] as UserRecord[] }));
      const nameOf = (m: Member) => users.find((u) => u.uid === m.uid)?.displayName?.trim().slice(0, 60) || m.name;
      // Each member's chosen face (users/{uid}.avatar), one batched read.
      const records = await db.getAll(...g.members.map((m) => userRef(m.uid)));
      const avatarOf = (m: Member) =>
        (records.find((r) => r.id === m.uid)?.get("avatar") as string | undefined) ?? defaultAvatar(m.uid);
      const members = await Promise.all(
        g.members.map(async (m) => {
          const base = { name: nameOf(m), avatar: avatarOf(m), isYou: m.uid === uid, sharing: m.shareScore };
          if (!m.shareScore) return base;
          const scores = await userRef(m.uid)
            .collection("sessions")
            .where("groupCode", "==", g.code)
            .select("createdAt", "status", "report.score", "report.scored", "mode")
            .get();
          const latest = scores.docs
            .map((d) => d.data())
            .filter((s) => s.status === "ready" && s.report?.scored === true)
            .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0];
          return {
            ...base,
            ...(latest && {
              score: latest.report.score as number,
              mode: latest.mode as string,
              createdAt: latest.createdAt as string,
            }),
          };
        }),
      );
      return {
        code: g.code,
        projectId: g.ownerUid === uid ? g.projectId : `group-${g.code}`,
        title: project?.analysis?.title || project?.name || "Group project",
        members,
      };
    }),
  );
}
