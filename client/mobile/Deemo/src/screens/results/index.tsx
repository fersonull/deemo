import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/button";
import { Icon } from "@/components/icon";
import { UpsellSheet } from "@/components/upsell-sheet";
import { Working } from "@/components/working";
import { MODE_LABELS } from "@/constants";
import { session as account, useSession } from "@/hooks/use-session";
import { sessions, type Report, type Session } from "@/hooks/use-sessions";
import { colors, fonts, radius, type } from "@/theme";
import { formatTime } from "@/utils/format-time";
import { riseIn } from "@/utils/motion";

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

// Every number in the score, spelled out (addendum Q4: the arithmetic is done in code and shown).
function formula(r: Report, severities: string[]) {
  const counts = (["HIGH", "MEDIUM", "LOW"] as const)
    .map((s) => [s, severities.filter((x) => x === s).length] as const)
    .filter(([, n]) => n)
    .map(([s, n]) => `${n} ${s.toLowerCase()}`);
  const coverage = `${Math.min(r.answered, r.planned)}/${r.planned}`;
  return `Rubric ${r.rubricScore} × coverage ${coverage} − consistency ${r.penalty}${counts.length ? ` (${counts.join(", ")})` : ""} = ${r.score}`;
}

// Defense Performance Analytics (plan F14, screen S-12). Free: score, fixes, contradictions, feedback,
// transcript. Premium: rubric breakdown, delivery stats, stronger answers (addendum Q1).
export function Results({ id, fromSession }: { id: string; fromSession: boolean }) {
  const { premium } = useSession();
  const [s, setS] = useState<Session | null>(null);
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

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close report" onPress={close} style={styles.close}>
          <Icon name="close" size={24} />
        </Pressable>
        {s ? (
          <Text style={styles.headerText}>
            {MODE_LABELS[s.mode]} · {day(s.createdAt)}
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
            ) : null /* first load: a blank beat beats flashing a waiting screen for a report that's ready */
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
                {formula(
                  r,
                  r.contradictions.map((c) => c.severity),
                )}
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

            <View style={styles.cta}>
              <Button label="Practice again" onPress={() => router.replace("/practice")} />
            </View>
            <Text style={styles.footnote}>Practice result, not an official evaluation.</Text>
          </Animated.View>
        </ScrollView>
      )}

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
  footnote: { ...type.meta, textAlign: "center", marginTop: 12 },
});
