/// <reference types="bun" />
import { expect, test } from "bun:test";

// Explicit opt-in: creates only disposable Auth users/Firestore records, then removes those exact IDs. No Gemini calls.
test.skipIf(process.env.DEEMO_GROUP_INTEGRATION !== "1")(
  "group routes isolate manuscripts, rubric, scores and account cleanup",
  async () => {
    const { db, getAuth } = await import("../src/firebase");
    const { app } = await import("../src/index");
    const { store } = await import("../src/store");
    const { sessions, parseSession } = await import("../src/sessions");
    const { accessibleProject, removeMemberships, reserveProject } = await import("../src/groups");
    const { buildPanelPrompt } = await import("../src/panel");
    const config = await Bun.file("../client/mobile/Deemo/google-services.json").json();
    const key = config.client[0].api_key[0].current_key;
    const server = app.listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address() as { port: number };
    const base = `http://127.0.0.1:${address.port}`;
    const ids: string[] = [];
    const tokens: string[] = [];
    async function request(who: number | null, path: string, method = "GET", body?: object) {
      const response = await fetch(base + path, {
        method,
        headers: { "content-type": "application/json", ...(who !== null && { authorization: `Bearer ${tokens[who]}` }) },
        ...(body && { body: JSON.stringify(body) }),
      });
      return { status: response.status, body: (await response.json().catch(() => null)) as any };
    }
    try {
      for (const name of ["Leader", "Member", "Outsider", "Racer"]) {
        const user = await getAuth().createUser({ email: `group-${crypto.randomUUID()}@deemo.test`, displayName: name });
        ids.push(user.uid);
        const signIn = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${key}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token: await getAuth().createCustomToken(user.uid), returnSecureToken: true }),
        });
        const signed = (await signIn.json()) as { idToken?: string };
        if (!signed.idToken) throw new Error(`Fixture sign-in failed (${signIn.status})`);
        tokens.push(signed.idToken);
        await db.collection("users").doc(user.uid).set({ premium: false });
      }
      const [owner, member, outsider, racer] = ids as [string, string, string, string];
      const project = {
        id: crypto.randomUUID(),
        name: "Disposable group manuscript",
        domain: "Data & AI",
        fileName: "fixture.pdf",
        sizeBytes: 1,
        createdAt: new Date().toISOString(),
        status: "ready" as const,
        confirmedAt: new Date().toISOString(),
        analysis: {
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
        },
      };
      await store.put(owner, project);
      expect((await request(null, "/groups")).status).toBe(401);
      const created = await request(0, `/projects/${project.id}/group`, "POST");
      expect(created.status).toBe(200);
      const code = created.body.group.code as string;
      expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
      expect((await request(0, `/projects/${project.id}/group`, "POST")).body.group.code).toBe(code);
      const joined = await request(1, "/groups/join", "POST", { code: code.toLowerCase() });
      expect(joined.status).toBe(200);
      const sharedId = joined.body.id as string;
      expect(joined.body.group).toMatchObject({ isOwner: false, shareScore: false, focusArea: "" });
      expect((await request(1, "/projects")).body).toHaveLength(1);
      expect((await request(2, `/projects/${sharedId}`)).status).toBe(404);
      expect((await request(2, `/groups/${code}/me`, "PATCH", { shareScore: true })).status).toBe(404);
      expect((await request(1, `/projects/${sharedId}/analysis`, "PATCH", { analysis: { title: "Tampered" } })).status).toBe(403);
      expect((await request(1, `/projects/${sharedId}/rubric`, "PATCH", { weights: [20, 20, 20, 20, 20] })).status).toBe(403);
      expect((await request(0, `/projects/${project.id}/rubric`, "PATCH", { weights: [100, 0, 0, 0, 0] })).status).toBe(400);
      expect((await request(0, `/projects/${project.id}/rubric`, "PATCH", { weights: [30, 25, 20, 15, 10] })).status).toBe(200);
      expect((await request(1, `/projects/${sharedId}`)).body.weights).toEqual([30, 25, 20, 15, 10]);
      expect((await request(1, `/groups/${code}/me`, "PATCH", { focusArea: "Database and testing" })).status).toBe(204);
      const setup = {
        mode: "PRE_ORAL",
        domain: "Data & AI",
        panelists: 1,
        minutes: 10,
        followUps: 2,
        difficulty: "STANDARD",
        projectId: sharedId,
      };
      expect((await request(2, "/live/token", "POST", setup)).status).toBe(403);
      const parsed = await parseSession(member, { ...setup, weights: [100, 0, 0, 0, 0], turns: [], lines: [], flags: [] });
      expect(parsed?.groupCode).toBe(code);
      expect(parsed?.weights).toEqual([30, 25, 20, 15, 10]);
      expect(parsed?.focusArea).toBe("Database and testing");
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
      expect((await request(1, `/projects/${sharedId}/rubric`, "PATCH", { rubric: panelRubric })).status).toBe(403);
      const lopsided = { ...panelRubric, criteria: panelRubric.criteria.map((c) => ({ ...c, weight: c.scored ? 30 : 0 })) };
      expect((await request(0, `/projects/${project.id}/rubric`, "PATCH", { rubric: lopsided })).status).toBe(400);
      expect((await request(0, `/projects/${project.id}/rubric`, "PATCH", { rubric: panelRubric })).status).toBe(200);
      expect((await request(1, `/projects/${sharedId}`)).body.rubric.criteria).toHaveLength(3);
      const custom = await parseSession(member, { ...setup, turns: [], lines: [], flags: [] });
      expect(custom?.weights).toEqual([60, 40, 0]);
      expect(custom?.rubric?.map((c) => c.scored)).toEqual([true, true, false]);
      expect((await request(0, `/projects/${project.id}/rubric`, "PATCH", { weights: [30, 25, 20, 15, 10] })).status).toBe(200);
      expect((await request(1, `/projects/${sharedId}`)).body.rubric).toBeUndefined();
      const shared = await accessibleProject(member, sharedId);
      expect(
        buildPanelPrompt(
          { ...setup, mode: "PRE_ORAL", difficulty: "STANDARD", focusArea: shared?.group?.focusArea },
          shared?.analysis,
        ),
      ).toContain('"Database and testing"');
      const privateId = crypto.randomUUID();
      await db
        .collection("users")
        .doc(member)
        .collection("sessions")
        .doc(privateId)
        .set({
          ...parsed,
          id: privateId,
          createdAt: new Date().toISOString(),
          status: "ready",
          report: { scored: true, score: 73 },
          lines: [{ text: "PRIVATE TRANSCRIPT" }],
        });
      expect((await request(0, `/sessions/${privateId}`)).status).toBe(404);
      // Practice weak topics only reads the student's own scored report (no token is minted on these paths).
      expect((await request(0, "/live/token", "POST", { ...setup, weakFrom: privateId })).status).toBe(404);
      expect((await request(1, "/live/token", "POST", { ...setup, weakFrom: "missing" })).status).toBe(404);
      expect((await request(1, "/live/token", "POST", { ...setup, weakFrom: "../x" })).status).toBe(400);
      let readiness = (await request(0, "/groups")).body[0];
      expect(readiness.members.find((m: any) => m.name === "Member").score).toBeUndefined();
      expect((await request(1, `/groups/${code}/me`, "PATCH", { shareScore: true })).status).toBe(204);
      readiness = (await request(0, "/groups")).body[0];
      expect(readiness.members.find((m: any) => m.name === "Member").score).toBe(73);
      expect(JSON.stringify(readiness)).not.toContain("PRIVATE TRANSCRIPT");
      expect(JSON.stringify(readiness)).not.toContain(privateId);
      expect(JSON.stringify(readiness)).not.toContain(member);
      await request(1, `/groups/${code}/me`, "PATCH", { shareScore: false });
      expect((await request(0, "/groups")).body[0].members.find((m: any) => m.name === "Member").score).toBeUndefined();
      await expect(reserveProject(member, { ...project, id: crypto.randomUUID() })).rejects.toMatchObject({ status: 403 });
      await store.put(outsider, { ...project, id: crypto.randomUUID() });
      expect((await request(2, "/groups/join", "POST", { code })).status).toBe(403);
      const competing = await Promise.allSettled([
        request(3, "/groups/join", "POST", { code }),
        reserveProject(racer, { ...project, id: crypto.randomUUID() }),
      ]);
      const joinedRace = competing[0]?.status === "fulfilled" && competing[0].value.status === 200;
      const uploadedRace = competing[1]?.status === "fulfilled";
      expect(Number(joinedRace) + Number(uploadedRace)).toBe(1);
      const exported = (await request(1, "/me/export")).body;
      expect(exported.name).toBe("Member");
      expect(exported.sessions.map((x: any) => x.id)).toEqual([privateId]);
      expect(exported.projects.some((p: any) => p.id === sharedId && p.group.code === code)).toBe(true);
      expect((await request(0, "/me/export")).body.sessions).toEqual([]);
      expect((await request(null, "/me/export")).status).toBe(401);
      expect((await request(1, `/groups/${code}/me`, "DELETE")).status).toBe(204);
      expect((await request(1, `/projects/${sharedId}`)).status).toBe(404);
      expect((await request(1, "/live/token", "POST", setup)).status).toBe(403);
      expect(await parseSession(member, { ...setup, turns: [], lines: [], flags: [] })).toBeNull();
      expect((await sessions.get(member, privateId))?.manuscriptContext).toContain("Group fixture");
      await request(1, "/groups/join", "POST", { code });
      expect((await request(1, "/me", "DELETE")).status).toBe(204);
      expect((await request(0, "/groups")).body[0].members.some((m: any) => m.name === "Member")).toBe(false);
      expect((await request(0, "/me", "DELETE")).status).toBe(204);
      expect((await db.collection("groups").doc(code).get()).exists).toBe(false);
      expect(await store.get(owner, project.id)).toBeNull();
      console.log("Verified: membership, private scores/reports, owner edits, focus, quota race, leave and account deletion.");
    } finally {
      for (const uid of ids) {
        await removeMemberships(uid);
        await db.recursiveDelete(db.collection("users").doc(uid));
        await getAuth()
          .deleteUser(uid)
          .catch((e) => {
            if (e.code !== "auth/user-not-found") throw e;
          });
      }
      server.close();
    }
  },
  180_000,
);
