import { randomInt } from "node:crypto";

import type { Project } from "../../manuscripts/domain/manuscript";

// Group projects (addendum Q10): a leader shares one confirmed manuscript; members join with its 6-character code.

export const CODE = /^[A-HJ-NP-Z2-9]{6}$/; // no look-alike letters or digits (I, O, 0, 1)
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const newCode = () => Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
export const MAX_MEMBERS = 20;

export type GroupInfo = { code: string; isOwner: boolean; shareScore: boolean; focusArea: string };
export type SharedProject = Project & { group?: GroupInfo };

// A member sees the leader's project under its group id ("group-CODE"); the leader sees their own id.
export const sharedId = (code: string, ownerId: string, uid: string, projectId: string) =>
  ownerId === uid ? projectId : `group-${code}`;

export function decorate(
  p: Project,
  g: { code: string; ownerId: string },
  member: { shareScore: boolean; focusArea: string },
  uid: string,
  defaultWeights: number[],
): SharedProject {
  return {
    ...p,
    id: sharedId(g.code, g.ownerId, uid, p.id),
    weights: p.weights ?? defaultWeights,
    group: { code: g.code, isOwner: g.ownerId === uid, shareScore: member.shareScore, focusArea: member.focusArea },
  };
}

export const PROJECT_ID = /^[A-Za-z0-9_-]{1,100}$/;
