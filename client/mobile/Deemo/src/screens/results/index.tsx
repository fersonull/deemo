import { PressableScale } from "@/components/pressable-scale";
import * as Print from "expo-print";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import Animated, { LinearTransition, useReducedMotion } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/button";
import { CountUp } from "@/components/count-up";
import { DeemoNote } from "@/components/deemo-note";
import { Icon } from "@/components/icon";
import { Fetching } from "@/components/fetching";
import { Sheet } from "@/components/sheet";
import { UpsellSheet } from "@/components/upsell-sheet";
import { Working } from "@/components/working";
import { DIFFICULTY_LABELS, MODE_LABELS, type Domain } from "@/constants";
import { practiceSetup } from "@/hooks/use-practice-setup";
import { projects, useProjects } from "@/hooks/use-projects";
import { session as account, useSession } from "@/hooks/use-session";
import { sessions, type Session } from "@/hooks/use-sessions";
import { colors, easeOut, fonts, lit, radius, type } from "@/theme";
import { bandOf } from "@/utils/bands";
import { formatTime } from "@/utils/format-time";
import { riseIn } from "@/utils/motion";
import { answeredStat, formula, notReached, reportHtml } from "@/utils/report-html";
import { shareFile } from "@/utils/share-file";

import { SCORING_MS, SCORING_STEPS } from "../scoring";

import { Contradictions, Criteria, Fixes, Label, Locked, Question, ResponseTimes, Transcript } from "./parts";

const POLL_MS = 2500;
const BAND_RANGE: Record<string, string> = {
  "Defense-ready": "Readiness 85–100%",
  "Nearly ready": "Readiness 70–84%",
  Developing: "Readiness 50–69%",
  "Needs preparation": "Readiness below 50%",
};

const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

// Defense Performance Analytics (plan F14, screen S-12). Free: score, fixes, contradictions, feedback,
// transcript. Premium: rubric breakdown, delivery stats, stronger answers (addendum Q1).
export function Results({ id, fromSession }: { id: string; fromSession: boolean }) {
  const { premium, name, email } = useSession();
  const [s, setS] = useState<Session | null>(null);
  const [sheet, setSheet] = useState<"share" | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState("");
  const { projects: mine, savingMembers } = useProjects();
  const group = mine.find((p) => s?.groupCode && p.group?.code === s.groupCode);
  const [error, setError] = useState("");
  const [upsell, setUpsell] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        const next = await sessions.get(id);
        if (!alive) return;
        setS(next);
        setError("");
        if (next.status === "scoring") timer = setTimeout(tick, POLL_MS);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Couldn't load this report.");
      }
    };
    void tick();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [id, attempt]);

  const close = () => (fromSession ? router.dismissAll() : router.back());
  const r = s?.report;

  // The group sheet and "Practice weak topics" both need the current project list.
  useEffect(() => {
    void projects.refresh();
  }, []);

  // The adviser's copy (design brief "PDF export", Premium): printed on the phone, sent through the share sheet.
  const exportPdf = async () => {
    if (!premium) return setUpsell(true);
    if (!s || !r) return;
    setExporting(true);
    setExportError("");
    try {
      const date = new Date(s.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      const { uri } = await Print.printToFileAsync({ html: reportHtml(s, r, { student: name ?? email ?? "Student", date }) });
      await shareFile(`DEEMO report ${day(s.createdAt)}.pdf`, "application/pdf", { uri });
    } catch {
      setExportError("Couldn't make the PDF. Try again.");
    } finally {
      setExporting(false);
    }
  };

  // Practice weak topics (prototype primary action): the same setup again, aimed at this report's weak spots.
  // The app sends only this session's id; the server builds the focus from the stored report.
  const practiceWeak = () => {
    if (!s) return;
    if (!premium && (s.mode === "FINAL" || s.panelists > 1)) return setUpsell(true);
    practiceSetup.set({
      mode: s.mode,
      domain: s.domain as Domain,
      panelists: s.panelists,
      followUps: s.followUps,
      difficulty: s.difficulty ?? "STANDARD",
      // The original manuscript may be gone (deleted, re-uploaded, left the group): use the current one instead.
      projectId: mine.some((p) => p.id === s.projectId) ? s.projectId! : practiceSetup.get().projectId,
      weakFrom: s.id,
    });
    router.replace("/mic-check");
  };

  const toggleShare = async (shareScore: boolean) => {
    if (!group) return;
    setSharing(true);
    setShareError("");
    try {
      await projects.updateMember(group, { shareScore });
    } catch {
      setShareError("Couldn't save score sharing. Check your connection and try again.");
    } finally {
      setSharing(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <PressableScale accessibilityRole="button" accessibilityLabel="Close report" onPress={close} style={styles.close}>
          <Icon name="close" size={24} />
        </PressableScale>
        {s ? (
          <Text style={styles.headerText}>
            {MODE_LABELS[s.mode]}
            {s.difficulty && s.difficulty !== "STANDARD" ? ` · ${DIFFICULTY_LABELS[s.difficulty]}` : ""}
            {s.weakFrom ? " · Weak topics" : ""} · {day(s.createdAt)}
          </Text>
        ) : null}
      </View>

      {!s || !r ? (
        <View style={styles.waiting}>
          {
            error ? (
              <Text style={styles.sub} accessibilityLiveRegion="polite">
                {error}
              </Text>
            ) : s ? (
              // Still scoring (opened from History mid-score), or scoring failed.
              <>
                <Working
                  title={"Writing up\nyour notes."}
                  subtitle={
                    s.status === "failed" ? (s.error ?? "We couldn't score this session.") : "This usually takes under a minute."
                  }
                  since={Date.parse(s.updatedAt ?? s.createdAt)}
                  expectedMs={SCORING_MS}
                  steps={s.status === "failed" ? undefined : SCORING_STEPS}
                />
                {s.status === "failed" ? (
                  <Animated.View entering={riseIn(0, reduced)} style={styles.cta}>
                    <Button
                      label="Try again"
                      onPress={() =>
                        sessions.rescore(id).then(
                          () => setAttempt((a) => a + 1),
                          () => {},
                        )
                      }
                    />
                  </Animated.View>
                ) : null}
              </>
            ) : (
              // First load of a finished report (e.g. from Recent). Fetching fades in after a beat, so a quick load skips it.
              <Fetching title={"Getting your\nreport."} subtitle="Pulling up your answers and the panel's notes." />
            )
          }
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* The report arrives in two beats: the verdict, then the details 60 ms later. */}
          <Animated.View entering={riseIn(0, reduced)}>
            <View
              style={styles.scoreRow}
              accessible
              accessibilityLabel={r.scored === false ? "Not scored" : `Readiness ${r.score} percent, ${r.band}`}
            >
              <Text style={styles.score}>
                {/* the score counts up once, like the prototype's reveal; only CountUp re-renders */}
                {r.scored === false ? "–" : <CountUp to={r.score} />}
                {r.scored === false ? null : <Text style={styles.unit}>%</Text>}
              </Text>
              <View>
                <Text style={[styles.band, r.scored !== false && { color: bandOf(r.score).ink }]}>{r.band.replace(" ", "\n")}.</Text>
                {BAND_RANGE[r.band] ? (
                  <View style={[styles.bandPill, { backgroundColor: bandOf(r.score).tint }]}>
                    <Text style={[styles.bandRange, { color: bandOf(r.score).ink }]}>{BAND_RANGE[r.band]}</Text>
                  </View>
                ) : null}
              </View>
            </View>
            {/* Deemo's note carries the headline; it cheers when the student is nearly ready (design D5). */}
            <DeemoNote
              mood={r.scored !== false && (r.band === "Defense-ready" || r.band === "Nearly ready") ? "cheering" : "encouraging"}
              style={styles.headline}
            >
              {r.headline}
            </DeemoNote>
            {r.scored === false ? null : (
              <Text style={styles.formula}>
                {formula(r)}
              </Text>
            )}
          </Animated.View>

          <Animated.View entering={riseIn(60, reduced)}>
            <View style={styles.stats}>
              <Stat value={formatTime(s.durationMs)} label="length" />
              <Stat {...answeredStat(s, r)} />
              <Stat
                value={String(r.contradictions.length)}
                label={r.contradictions.length === 1 ? "contradiction" : "contradictions"}
              />
            </View>
            {notReached(s).length ? (
              <Text style={styles.notReached}>Not reached: {notReached(s).join(", ")}</Text>
            ) : null}

            {r.fixes.length ? (
              <>
                <Label>TOP 3 THINGS TO FIX</Label>
                <Fixes fixes={r.fixes} turns={s.turns} />
              </>
            ) : null}

            {r.contradictions.length ? (
              <>
                <Label>CONTRADICTIONS</Label>
                <Contradictions items={r.contradictions} turns={s.turns} />
              </>
            ) : null}

            <Label>RUBRIC</Label>
            {premium ? (
              <>
                <Criteria criteria={r.criteria} />
                <Label>RESPONSE TIME</Label>
                <ResponseTimes turns={s.turns} delivery={r.delivery} />
              </>
            ) : (
              <Locked
                title="Rubric breakdown and delivery stats"
                body="See how each criterion scored, and why. Included in Premium."
                onPress={() => setUpsell(true)}
              />
            )}

            {s.turns.length ? (
              <>
                <Label>QUESTION BY QUESTION</Label>
                <View style={styles.cards}>
                  {s.turns.map((t, i) => (
                    <Question key={i} turn={t} feedback={r.turns[i]} premium={premium} onLocked={() => setUpsell(true)} />
                  ))}
                </View>
              </>
            ) : null}

            <Animated.View layout={LinearTransition.duration(200).easing(easeOut)} style={styles.transcript}>
              <Transcript lines={s.lines} count={r.answered} />
            </Animated.View>

            {/* Actions, as in the prototype: weak topics, practice again / share with group, the adviser's PDF. */}
            <View style={styles.actions}>
              {r.scored === false ? (
                <Button label="Practice again" onPress={() => router.replace("/practice")} />
              ) : (
                <>
                  <Button label="Practice weak topics" onPress={practiceWeak} />
                  <View style={styles.actionRow}>
                    <PressableScale
                      lit
                      accessibilityRole="button"
                      onPress={() => router.replace("/practice")}
                      style={[styles.actionSize, styles.flexAction, styles.action, styles.actionSand]}
                    >
                      <Text style={styles.actionText}>Practice again</Text>
                    </PressableScale>
                    {group ? (
                      <PressableScale
                        lit
                        accessibilityRole="button"
                        onPress={() => setSheet("share")}
                        style={[styles.actionSize, styles.flexAction, styles.action, styles.actionSand]}
                      >
                        <Icon name="group" size={17} />
                        <Text style={styles.actionText}>Share with group</Text>
                      </PressableScale>
                    ) : null}
                  </View>
                </>
              )}
              <PressableScale
                lit
                accessibilityRole="button"
                accessibilityHint={premium ? "Makes a PDF to send to your adviser" : "Premium"}
                accessibilityState={{ busy: exporting }}
                busy={exporting}
                disabled={exporting}
                onPress={exportPdf}
                style={[styles.actionSize, styles.action, styles.actionOutline]}
              >
                {!exporting ? <Icon name={premium ? "picture_as_pdf" : "lock"} size={17} /> : null}
                <Text accessibilityLiveRegion="polite" style={styles.actionText}>{exporting ? "Making your PDF…" : "Export PDF"}</Text>
              </PressableScale>
              {exportError ? (
                <Text style={styles.sub} accessibilityLiveRegion="polite">
                  {exportError}
                </Text>
              ) : null}
            </View>
            <Text style={styles.footnote}>Practice result, not an official evaluation.</Text>
          </Animated.View>
        </ScrollView>
      )}

      <Sheet visible={sheet === "share"} onClose={() => setSheet(null)}>
        <Text style={type.title}>Share with group</Text>
        <Text style={styles.sheetNote}>Your group sees only your score, not your transcript or feedback.</Text>
        <View style={styles.shareRow}>
          <Text style={styles.shareText}>Show my average score on the Group readiness card</Text>
          <Switch
            accessibilityLabel="Show my average score on the Group readiness card"
            value={!!group?.group?.shareScore}
            disabled={sharing || !group || savingMembers.includes(group.id)}
            onValueChange={toggleShare}
            trackColor={{ false: colors.border, true: colors.dusk }}
            thumbColor={colors.onFill}
          />
        </View>
        {shareError ? <Text accessibilityLiveRegion="polite" style={styles.sheetNote}>{shareError}</Text> : null}
        <View style={styles.cta}>
          <Button label="Done" onPress={() => setSheet(null)} />
        </View>
      </Sheet>

      <UpsellSheet
        visible={upsell}
        onClose={() => setUpsell(false)}
        onUpgrade={() => {
          account.upgrade();
          setUpsell(false);
        }}
      />
    </SafeAreaView>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel} numberOfLines={1} adjustsFontSizeToFit>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  header: { height: 52, flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10 },
  close: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  headerText: { fontFamily: fonts.body, fontWeight: "500", fontSize: 13, color: colors.inkMuted },
  waiting: { flex: 1, paddingHorizontal: 22, paddingBottom: 24 },
  scroll: { paddingHorizontal: 20, paddingBottom: 32 },
  sub: { ...type.body, color: colors.inkMuted, textAlign: "center" },
  scoreRow: { flexDirection: "row", alignItems: "center", gap: 16, marginTop: 4 },
  score: {
    fontFamily: fonts.display,
    fontWeight: "800",
    fontSize: 88,
    lineHeight: 92,
    letterSpacing: -4,
    color: colors.ink,
  },
  unit: { fontSize: 40, letterSpacing: -1 },
  band: { ...type.title, fontSize: 26, lineHeight: 27 },
  bandPill: { alignSelf: "flex-start", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, marginTop: 8 },
  bandRange: { ...type.meta, fontFamily: fonts.body, fontWeight: "600", fontSize: 11.5 },
  headline: { marginTop: 12 },
  notReached: { ...type.meta, color: colors.inkMuted, marginTop: 8 },
  formula: { fontFamily: fonts.mono, fontWeight: "400", fontSize: 11.5, lineHeight: 17, color: colors.muted, marginTop: 8 },
  stats: { flexDirection: "row", gap: 8, marginTop: 16 },
  stat: { ...lit, flex: 1, backgroundColor: colors.sand, borderRadius: radius.lg, paddingVertical: 12, paddingHorizontal: 16 },
  statValue: { fontFamily: fonts.mono, fontWeight: "500", fontSize: 18, color: colors.ink },
  statLabel: { ...type.meta, fontSize: 11.5, marginTop: 2 },
  cards: { gap: 8 },
  transcript: { marginTop: 16 },
  cta: { marginTop: 24 },
  actions: { gap: 8, marginTop: 24 },
  actionSize: { height: 50 },
  action: { borderRadius: radius.pill, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  actionSand: { backgroundColor: colors.sand },
  actionRow: { flexDirection: "row", gap: 8 },
  flexAction: { flex: 1 },
  actionOutline: { backgroundColor: colors.paper, borderWidth: 1.5, borderColor: colors.sand },
  actionText: { fontFamily: fonts.body, fontWeight: "600", fontSize: 14, color: colors.ink },
  sheetNote: { ...type.body, fontSize: 13.5, lineHeight: 20, color: colors.inkMuted, marginTop: 8 },
  shareRow: {
    ...lit,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginTop: 16,
    backgroundColor: colors.sand,
    borderRadius: radius.xl,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  shareText: { flex: 1, fontFamily: fonts.body, fontWeight: "500", fontSize: 14.5, lineHeight: 20, color: colors.ink },
  footnote: { ...type.meta, textAlign: "center", marginTop: 12 },
});
