/// <reference types="bun" />
import { expect, test } from "bun:test";

import { client, createProject, createStudent, fakeGemini, removeStudent, startServer } from "./helpers";

// Explicit opt-in (DEEMO_GROUP_INTEGRATION=1, a test DATABASE_URL): disposable Auth users and their rows only.
test.skipIf(process.env.DEEMO_GROUP_INTEGRATION !== "1")(
  "group routes isolate manuscripts, rubric, scores and account cleanup",
  async () => {
    const { prisma } = await import("../src/shared/prisma");
    const { uploadManuscript } = await import("../src/modules/manuscripts/application/projects");
    const restoreFetch = fakeGemini(() => Response.json({ name: "fixture-token" }));
    const { base, close } = await startServer();
    const request = client(base);
    const students: { uid: string; token: string }[] = [];
    try {
      for (const name of ["Leader", "Member", "Outsider", "Racer"]) students.push(await createStudent(name));
      const [leader, member, outsider, racer] = students as [typeof students[0], typeof students[0], typeof students[0], typeof students[0]];
      const projectId = await createProject(leader.uid);

      expect((await request(null, "/groups")).status).toBe(401);
      const created = await request(leader.token, `/projects/${projectId}/group`, "POST");
      expect(created.status).toBe(200);
      const code = created.body.group.code as string;
      expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
      expect((await request(leader.token, `/projects/${projectId}/group`, "POST")).body.group.code).toBe(code);
      const joined = await request(member.token, "/groups/join", "POST", { code: code.toLowerCase() });
      expect(joined.status).toBe(200);
      const sharedId = joined.body.id as string;
      expect(joined.body.group).toMatchObject({ isOwner: false, shareScore: false, focusArea: "" });
      expect((await request(member.token, "/projects")).body).toHaveLength(1);
      expect((await request(outsider.token, `/projects/${sharedId}`)).status).toBe(404);
      expect((await request(outsider.token, `/groups/${code}/me`, "PATCH", { shareScore: true })).status).toBe(404);
      expect((await request(member.token, `/projects/${sharedId}/analysis`, "PATCH", { analysis: { title: "Tampered" } })).status).toBe(403);
      expect((await request(member.token, `/projects/${sharedId}/rubric`, "PATCH", { weights: [20, 20, 20, 20, 20] })).status).toBe(403);
      expect((await request(leader.token, `/projects/${projectId}/rubric`, "PATCH", { weights: [100, 0, 0, 0, 0] })).status).toBe(400);
      expect((await request(leader.token, `/projects/${projectId}/rubric`, "PATCH", { weights: [30, 25, 20, 15, 10] })).status).toBe(200);
      expect((await request(member.token, `/projects/${sharedId}`)).body.weights).toEqual([30, 25, 20, 15, 10]);
      expect((await request(member.token, `/groups/${code}/me`, "PATCH", { focusArea: "Database and testing" })).status).toBe(204);

      const setup = { mode: "PRE_ORAL", domain: "Data & AI", panelists: 1, minutes: 10, followUps: 2, difficulty: "STANDARD", projectId: sharedId };
      expect((await request(outsider.token, "/live/token", "POST", { ...setup, startId: "outsider" })).status).toBe(403);
      // An empty session is saved and reported "Not scored" with no AI call.
      const empty = { ...setup, turns: [], lines: [], flags: [] };
      const saved = await request(member.token, "/sessions", "POST", { ...empty, weights: [100, 0, 0, 0, 0] });
      expect(saved.status).toBe(202);
      expect(saved.body).toMatchObject({ groupCode: code, weights: [30, 25, 20, 15, 10], focusArea: "Database and testing" });

      // The panel's own rubric replaces the default for every member; only the leader sets it.
      const level = ["Poor", "Fair", "Excellent"];
      const panelRubric = {
        source: "form.pdf",
        criteria: [
          { name: "Mastery", desc: "Knows the study.", points: 60, weight: 60, scored: true, levels: level },
          { name: "Delivery", desc: "Speaks clearly.", points: 40, weight: 40, scored: true, levels: level },
          { name: "Paper", desc: "Formatting.", points: 10, weight: 0, scored: false, levels: level },
        ],
      };
      expect((await request(member.token, `/projects/${sharedId}/rubric`, "PATCH", { rubric: panelRubric })).status).toBe(403);
      const lopsided = { ...panelRubric, criteria: panelRubric.criteria.map((c) => ({ ...c, weight: c.scored ? 30 : 0 })) };
      expect((await request(leader.token, `/projects/${projectId}/rubric`, "PATCH", { rubric: lopsided })).status).toBe(400);
      expect((await request(leader.token, `/projects/${projectId}/rubric`, "PATCH", { rubric: panelRubric })).status).toBe(200);
      expect((await request(member.token, `/projects/${sharedId}`)).body.rubric.criteria).toHaveLength(3);
      const custom = (await request(member.token, "/sessions", "POST", empty)).body;
      expect(custom.weights).toEqual([60, 40, 0]);
      expect(custom.rubric.map((c: any) => c.scored)).toEqual([true, true, false]);
      expect((await request(leader.token, `/projects/${projectId}/rubric`, "PATCH", { weights: [30, 25, 20, 15, 10] })).status).toBe(200);
      expect((await request(member.token, `/projects/${sharedId}`)).body.rubric).toBeUndefined();

      // A scored session of the member's, written straight to the database.
      const privateId = crypto.randomUUID();
      await prisma.session.create({
        data: {
          id: privateId, userId: member.uid, status: "ready", projectId: sharedId, groupCode: code, title: "Group fixture",
          mode: "PRE_ORAL", domain: "Data & AI", minutes: 10, panelists: 1, followUps: 2, difficulty: "STANDARD",
          durationMs: 0, endedBy: "student", weights: [30, 25, 20, 15, 10], manuscriptContext: "Title: Group fixture",
          lines: [{ who: "you", text: "PRIVATE TRANSCRIPT" }],
          report: { create: { score: 73, band: "Nearly ready", message: "", scored: true, rubricScore: 73, penalty: 0, answered: 1, planned: 1, headline: "" } },
        },
      });
      expect((await request(leader.token, `/sessions/${privateId}`)).status).toBe(404);
      // Practice weak topics only reads the student's own scored report.
      expect((await request(leader.token, "/live/token", "POST", { ...setup, projectId, startId: "w1", weakFrom: privateId })).status).toBe(404);
      expect((await request(member.token, "/live/token", "POST", { ...setup, startId: "w2", weakFrom: "missing" })).status).toBe(404);
      expect((await request(member.token, "/live/token", "POST", { ...setup, startId: "w3", weakFrom: "../x" })).status).toBe(400);

      const memberRow = (r: any) => r.members.find((m: any) => m.name === "Member");
      expect(memberRow((await request(leader.token, "/groups")).body[0]).score).toBeUndefined();
      expect((await request(member.token, `/groups/${code}/me`, "PATCH", { shareScore: true })).status).toBe(204);
      const readiness = (await request(leader.token, "/groups")).body[0];
      expect(memberRow(readiness).score).toBe(73);
      expect(memberRow(readiness).avatar).toMatch(/^[0-9a-f]{8}$/);
      expect(JSON.stringify(readiness)).not.toContain("PRIVATE TRANSCRIPT");
      expect(JSON.stringify(readiness)).not.toContain(privateId);
      expect(JSON.stringify(readiness)).not.toContain(member.uid);
      await request(member.token, `/groups/${code}/me`, "PATCH", { shareScore: false });
      expect(memberRow((await request(leader.token, "/groups")).body[0]).score).toBeUndefined();

      // The free plan's one manuscript slot: a joined project counts, and a join racing an upload can't both win.
      const account = async (uid: string) => (await prisma.user.findUniqueOrThrow({ where: { id: uid } }));
      const upload = { bytes: new TextEncoder().encode("%PDF-fixture"), type: "application/pdf" as const, size: 12, name: "x", domain: "Data & AI", fileName: "x.pdf" };
      await expect(uploadManuscript(await account(member.uid), upload)).rejects.toMatchObject({ status: 403 });
      await createProject(outsider.uid);
      expect((await request(outsider.token, "/groups/join", "POST", { code })).status).toBe(403);
      const race = await Promise.allSettled([
        request(racer.token, "/groups/join", "POST", { code }),
        uploadManuscript(await account(racer.uid), upload),
      ]);
      const joinedRace = race[0].status === "fulfilled" && race[0].value.status === 200;
      expect(Number(joinedRace) + Number(race[1].status === "fulfilled")).toBe(1);

      // One group per student on every plan (issue #12): a Premium leader of their own group can't join another, and a
      // member can't start a second one.
      const premium = await createStudent("Premium", { premium: true });
      students.push(premium);
      const ownId = await createProject(premium.uid);
      const own = await request(premium.token, `/projects/${ownId}/group`, "POST");
      expect(own.status).toBe(200);
      const second = await request(premium.token, "/groups/join", "POST", { code });
      expect(second.status).toBe(409);
      expect(second.body.error).toContain("already in a group");
      expect((await request(leader.token, "/groups/join", "POST", { code: own.body.group.code })).status).toBe(409);

      const exported = (await request(member.token, "/me/export")).body;
      expect(exported.name).toBe("Member");
      expect(exported.sessions.map((x: any) => x.id)).toContain(privateId);
      expect(exported.projects.some((p: any) => p.id === sharedId && p.group.code === code)).toBe(true);
      expect((await request(leader.token, "/me/export")).body.sessions).toEqual([]);
      expect((await request(null, "/me/export")).status).toBe(401);
      expect((await request(member.token, `/groups/${code}/me`, "DELETE")).status).toBe(204);
      expect((await request(member.token, `/projects/${sharedId}`)).status).toBe(404);
      expect((await request(member.token, "/sessions", "POST", empty)).status).toBe(400);
      expect((await prisma.session.findUnique({ where: { id: privateId } }))?.manuscriptContext).toContain("Group fixture");
      await request(member.token, "/groups/join", "POST", { code });
      expect((await request(member.token, "/me", "DELETE")).status).toBe(204);
      expect((await request(leader.token, "/groups")).body[0].members.some((m: any) => m.name === "Member")).toBe(false);
      expect(await prisma.session.count({ where: { userId: member.uid } })).toBe(0);
      expect((await request(leader.token, "/me", "DELETE")).status).toBe(204);
      expect(await prisma.group.findUnique({ where: { code } })).toBeNull();
      expect(await prisma.project.findUnique({ where: { id: projectId } })).toBeNull();
      console.log("Verified: membership, private scores/reports, owner edits, focus, quota race, leave and account deletion.");
    } finally {
      restoreFetch();
      for (const s of students) await removeStudent(s.uid);
      await close();
    }
  },
  180_000,
);
