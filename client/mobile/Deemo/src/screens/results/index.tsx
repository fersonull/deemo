import * as Print from "expo-print";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/button";
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
import { colors, fonts, radius, type } from "@/theme";
import { formatTime } from "@/utils/format-time";
import { riseIn } from "@/utils/motion";
import { formula, reportHtml } from "@/utils/report-html";
import { shareFile } from "@/utils/share-file";

import { SCORING_MS, SCORING_STEPS } from "../scoring";

import { Contradictions, Criteria, Fixes, Label, Locked, Question, ResponseTimes, Transcript } from "./parts";

const POLL_MS = 2500;
const BAND_RANGE: Record<string, string> = {
  "Defense-ready": "85–100 band",
  "Nearly ready": "70–84 band",
  Developing: "50–69 band",
  "Needs preparation": "Below 50",
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
  const group = useProjects().projects.find((p) => s?.groupCode && p.group?.code === s.groupCode);
  const [error, setError] = useState("");
  const [upsell, setUpsell] = useState(false);
  const [shown, setShown] = useState(0);
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

  // The score counts up once, like the prototype's reveal.
  const target = s?.report?.score ?? 0;
  useEffect(() => {
    if (!target) return;
    const t = setInterval(() => setShown((v) => (v >= target ? (clearInterval(t), target) : Math.min(target, v + 2))), 24);
    return () => clearInterval(t);
  }, [target]);

  const close = () => (fromSession ? router.dismissAll() : router.back());
  const r = s?.report;

  useEffect(() => {
    if (s?.groupCode) void projects.refresh();
  }, [s?.groupCode]);

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
    if (!premium && (s.mode === "FINAL" || s.panelists > 1 || s.minutes > 10)) return setUpsell(true);
    practiceSetup.set({
      mode: s.mode,
      domain: s.domain as Domain,
      panelists: s.panelists,
      minutes: s.minutes,
      followUps: s.followUps,
      difficulty: s.difficulty ?? "STANDARD",
      projectId: s.projectId ?? null,
      weakFrom: s.id,
    });
    router.replace("/mic-check");
  };

  const toggleShare = async (shareScore: boolean) => {
    if (!group) return;
    setSharing(true);
    await projects.updateMember(group, { shareScore }).catch(() => {});
    setSharing(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close report" onPress={close} style={styles.close}>
          <Icon name="close" size={24} />
        </Pressable>
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
              accessibilityLabel={r.scored === false ? "Not scored" : `Readiness ${r.score} out of 100, ${r.band}`}
            >
              <Text style={styles.score}>{r.scored === false ? "–" : shown}</Text>
              <View>
                <Text style={styles.band}>{r.band.replace(" ", "\n")}.</Text>
                {BAND_RANGE[r.band] ? <Text style={styles.bandRange}>{BAND_RANGE[r.band]}</Text> : null}
              </View>
            </View>
            <Text style={styles.headline}>{r.headline}</Text>
            {r.scored === false ? null : (
              <Text style={styles.formula}>
                {formula(r)}
              </Text>
            )}
          </Animated.View>

          <Animated.View entering={riseIn(60, reduced)}>
            <View style={styles.stats}>
              <Stat value={formatTime(s.durationMs)} label="length" />
              <Stat value={String(r.answered)} label="answered" />
              <Stat
                value={String(r.contradictions.length)}
                label={r.contradictions.length === 1 ? "contradiction" : "contradictions"}
              />
            </View>

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

            <View style={styles.transcript}>
              <Transcript lines={s.lines} count={r.answered} />
            </View>

            {/* Actions, as in the prototype: weak topics, practice again / share with group, the adviser's PDF. */}
            <View style={styles.actions}>
              {r.scored === false ? (
                <Button label="Practice again" onPress={() => router.replace("/practice")} />
              ) : (
                <>
                  <Button label="Practice weak topics" onPress={practiceWeak} />
                  <View style={styles.actionRow}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => router.replace("/practice")}
                      style={({ pressed }) => [styles.action, styles.actionSand, styles.flexAction, pressed && styles.pressed]}
                    >
                      <Text style={styles.actionText}>Practice again</Text>
                    </Pressable>
                    {group ? (
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => setSheet("share")}
                        style={({ pressed }) => [styles.action, styles.actionSand, styles.flexAction, pressed && styles.pressed]}
                      >
                        <Icon name="group" size={17} />
                        <Text style={styles.actionText}>Share with group</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityHint={premium ? "Makes a PDF to send to your adviser" : "Premium"}
                accessibilityState={{ busy: exporting }}
                disabled={exporting}
                onPress={exportPdf}
                style={({ pressed }) => [styles.action, styles.actionOutline, pressed && styles.pressed]}
              >
                <Icon name={premium ? "picture_as_pdf" : "lock"} size={17} />
                <Text style={styles.actionText}>{exporting ? "Making your PDF…" : "Export PDF"}</Text>
              </Pressable>
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
          <Text style={styles.shareText}>Show my latest score on the Group readiness card</Text>
          <Switch
            accessibilityLabel="Show my latest score on the Group readiness card"
            value={!!group?.group?.shareScore}
            disabled={sharing}
            onValueChange={toggleShare}
            trackColor={{ false: colors.border, true: colors.dusk }}
            thumbColor={colors.paper}
          />
        </View>
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
    fontVariant: ["tabular-nums"],
  },
  band: { ...type.title, fontSize: 26, lineHeight: 27 },
  bandRange: { ...type.meta, marginTop: 4 },
  headline: { ...type.body, fontSize: 15, lineHeight: 22, marginTop: 10 },
  formula: { fontFamily: fonts.mono, fontWeight: "400", fontSize: 11.5, lineHeight: 17, color: colors.muted, marginTop: 8 },
  stats: { flexDirection: "row", gap: 8, marginTop: 16 },
  stat: { flex: 1, backgroundColor: colors.sand, borderRadius: radius.lg, paddingVertical: 12, paddingHorizontal: 14 },
  statValue: { fontFamily: fonts.mono, fontWeight: "500", fontSize: 18, color: colors.ink },
  statLabel: { ...type.meta, fontSize: 11.5, marginTop: 2 },
  cards: { gap: 8 },
  transcript: { marginTop: 16 },
  cta: { marginTop: 20 },
  actions: { gap: 8, marginTop: 22 },
  action: { height: 50, borderRadius: radius.pill, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  actionSand: { backgroundColor: colors.sand },
  actionRow: { flexDirection: "row", gap: 8 },
  flexAction: { flex: 1 },
  actionOutline: { borderWidth: 1.5, borderColor: colors.sand },
  actionText: { fontFamily: fonts.body, fontWeight: "600", fontSize: 14, color: colors.ink },
  pressed: { opacity: 0.85 },
  sheetNote: { ...type.body, fontSize: 13.5, lineHeight: 20, color: colors.inkMuted, marginTop: 8 },
  shareRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 16,
    backgroundColor: colors.sand,
    borderRadius: radius.xl,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  shareText: { flex: 1, fontFamily: fonts.body, fontWeight: "500", fontSize: 14.5, lineHeight: 20, color: colors.ink },
  footnote: { ...type.meta, textAlign: "center", marginTop: 12 },
});
