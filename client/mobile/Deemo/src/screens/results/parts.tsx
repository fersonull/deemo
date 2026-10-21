import { PressableScale } from "@/components/pressable-scale";
import { useEffect, useState, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { Icon } from "@/components/icon";
import { PanelFace } from "@/components/panel-face";
import { PANEL } from "@/constants";
import type { Report, Session, SessionTurn } from "@/hooks/use-sessions";
import { colors, easeOut, fonts, lit, radius, type } from "@/theme";
import { turnLabel } from "@/utils/report-html";


// Expanding cards: the card's height glides, the details fade in, the chevron turns (200 ms, ease-out).
// Reanimated skips all of it when the system reduces motion.
const glide = LinearTransition.duration(200).easing(easeOut);
const reveal = FadeIn.duration(200).easing(easeOut);
const hide = FadeOut.duration(120);

function Chevron({ open }: { open: boolean }) {
  const turn = useSharedValue(open ? 180 : 0);
  useEffect(() => {
    turn.value = withTiming(open ? 180 : 0, { duration: 200, easing: easeOut });
  }, [open, turn]);
  const turning = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value}deg` }] }));
  return (
    <Animated.View style={turning}>
      <Icon name="expand_more" size={22} color={colors.muted} />
    </Animated.View>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <Text style={[type.label, styles.section]}>{children}</Text>;
}

export function Fixes({ fixes, turns }: { fixes: Report["fixes"]; turns: SessionTurn[] }) {
  return (
    <View style={styles.cards}>
      {fixes.map((f, i) => (
        <View key={i} style={[styles.card, styles.fix]}>
          <Text style={styles.fixN}>{i + 1}</Text>
          <View style={styles.flex}>
            <Text style={styles.body}>{f.text}</Text>
            {f.turn !== null && turns[f.turn] ? <Text style={styles.meta}>{turnLabel(turns[f.turn])}</Text> : null}
          </View>
        </View>
      ))}
    </View>
  );
}

const SEVERITY = { HIGH: "High", MEDIUM: "Medium", LOW: "Low" } as const;

// "You said" against the manuscript (addendum Q3, layer 3: verified after the session).
export function Contradictions({ items, turns }: { items: Report["contradictions"]; turns: SessionTurn[] }) {
  return (
    <View style={styles.cards}>
      {items.map((c, i) => (
        <View key={i} style={styles.card}>
          <View style={styles.cHead}>
            <Text style={[styles.meta, styles.flex]}>{c.turn !== null && turns[c.turn] ? turnLabel(turns[c.turn]) : "During the session"}</Text>
            <View style={styles.severity}>
              <Icon name="error" size={14} color={colors.amberInk} filled />
              <Text style={styles.severityText}>{SEVERITY[c.severity]}</Text>
            </View>
          </View>
          <View style={styles.quotes}>
            <View style={styles.quote}>
              <Text style={type.label}>YOU SAID</Text>
              <Text style={styles.body}>{`"${c.spokenClaim}"`}</Text>
            </View>
            <View style={[styles.quote, styles.manuscript]}>
              <Text style={type.label}>YOUR MANUSCRIPT</Text>
              <Text style={styles.body}>{`"${c.manuscriptEvidence}"`}</Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

export function Criteria({ criteria }: { criteria: Report["criteria"] }) {
  return (
    <View style={[styles.card, styles.criteria]}>
      {criteria.map((c) => (
        <View key={c.key}>
          <View style={styles.cHead}>
            <Text style={[styles.strong, styles.flex]}>{c.name}</Text>
            <Text style={styles.mono}>{c.level === null ? "Not measured" : `${c.level}/5 · ${c.weight}%`}</Text>
          </View>
          <View style={styles.track}>
            {/* Bar = points earned: level 1 is empty, 5 is full (server/src/modules/scoring/domain/scoring.ts levelPoints). */}
            <View style={[styles.bar, { width: `${c.level === null ? 0 : ((c.level - 1) / 4) * 100}%` }]} />
          </View>
          <Text style={styles.why}>{c.why}</Text>
        </View>
      ))}
    </View>
  );
}

// Response Duration Tracking (plan F12): seconds before each answer started.
export function ResponseTimes({ turns, delivery }: { turns: SessionTurn[]; delivery: Report["delivery"] }) {
  const spoken = turns.filter((t) => t.latencyMs !== null);
  const max = Math.max(8000, ...spoken.map((t) => t.latencyMs ?? 0));
  return (
    <View style={styles.card}>
      {spoken.length ? (
        <View style={styles.bars}>
          {spoken.map((t, i) => (
            <View key={i} style={styles.barCol}>
              <Text style={styles.barValue}>{((t.latencyMs ?? 0) / 1000).toFixed(1)}s</Text>
              <View style={[styles.vbar, { height: 8 + ((t.latencyMs ?? 0) / max) * 72 }]} />
              <Text style={styles.meta}>{turnLabel(t)}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.meta}>No spoken answers to time.</Text>
      )}
      <View style={styles.deliveryRow}>
        <Text style={styles.meta}>
          <Text style={styles.strong}>{delivery.fillersPerMin ?? "–"}</Text> fillers/min
        </Text>
        <Text style={styles.meta}>
          <Text style={styles.strong}>{delivery.wordsPerMin ?? "–"}</Text> words/min
        </Text>
      </View>
    </View>
  );
}

export function Locked({ title, body, onPress }: { title: string; body: string; onPress: () => void }) {
  return (
    <PressableScale accessibilityRole="button" accessibilityHint="Premium" onPress={onPress} style={[styles.card, styles.locked]}>
      <View style={styles.lockTile}>
        <Icon name="lock" size={20} color={colors.duskIcon} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.strong}>{title}</Text>
        <Text style={styles.meta}>{body}</Text>
      </View>
    </PressableScale>
  );
}

type QuestionProps = { turn: SessionTurn; feedback: Report["turns"][number]; premium: boolean; onLocked: () => void };

export function Question({ turn, feedback, premium, onLocked }: QuestionProps) {
  const [open, setOpen] = useState(false);
  return (
    <Animated.View layout={glide} style={styles.card}>
      <PressableScale accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)} style={styles.qHead}>
        <Text style={styles.qLabel}>{turnLabel(turn)}</Text>
        <Text style={[styles.body, styles.flex]} numberOfLines={open ? undefined : 2}>
          {turn.question}
        </Text>
        <Chevron open={open} />
      </PressableScale>
      {open ? (
        <Animated.View entering={reveal} exiting={hide} style={styles.qBody}>
          <Text style={styles.chip}>{turn.type.charAt(0) + turn.type.slice(1).toLowerCase()}</Text>
          <View>
            <Text style={type.label}>YOUR ANSWER</Text>
            <Text style={styles.body}>{turn.answer.trim() || "(no answer)"}</Text>
          </View>
          <View>
            <Text style={type.label}>FEEDBACK</Text>
            <Text style={styles.body}>{feedback.feedback}</Text>
          </View>
          {premium ? (
            <View style={styles.better}>
              <Text style={type.label}>A STRONGER ANSWER</Text>
              <Text style={styles.body}>{feedback.betterAnswer}</Text>
            </View>
          ) : (
            <PressableScale accessibilityRole="button" accessibilityHint="Premium" onPress={onLocked} style={styles.betterLocked}>
              <Icon name="lock" size={16} color={colors.duskLink} />
              <Text style={styles.link}>See a stronger answer</Text>
            </PressableScale>
          )}
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

export function Transcript({ lines, count }: { lines: Session["lines"]; count: number }) {
  const [open, setOpen] = useState(false);
  return (
    <Animated.View layout={glide} style={styles.card}>
      <PressableScale accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)} style={styles.qHead}>
        <Icon name="subject" size={20} color={colors.inkMuted} />
        <Text style={[styles.strong, styles.flex]}>
          Full transcript · {count} {count === 1 ? "question" : "questions"}
        </Text>
        <Chevron open={open} />
      </PressableScale>
      {open ? (
        <Animated.View entering={reveal} exiting={hide} style={styles.qBody}>
          {lines.map((l, i) => (
            <View key={i} style={styles.line}>
              {l.flagged ? <View key="flag" style={[styles.dot, styles.dotFlag]} /> : <View key="none" style={styles.dot} />}
              {l.who === "you" ? null : <View style={styles.face}><PanelFace index={l.who} size={20} still /></View>}
              <Text style={[styles.body, styles.flex]}>
                <Text style={styles.strong}>{l.who === "you" ? "You" : PANEL[l.who]?.name}</Text> {l.text}
              </Text>
            </View>
          ))}
          {lines.some((l) => l.flagged) ? (
            <View style={styles.line}>
              <View style={[styles.dot, styles.dotFlag]} />
              <Text style={styles.meta}>{"Doesn't match your manuscript"}</Text>
            </View>
          ) : null}
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  section: { marginTop: 24, marginBottom: 8 },
  cards: { gap: 8 },
  card: { ...lit, backgroundColor: colors.sand, borderRadius: radius.xl, padding: 16 },
  body: { ...type.body, lineHeight: 20.5 },
  strong: { fontFamily: fonts.body, fontWeight: "600", fontSize: 14, color: colors.ink },
  meta: { ...type.meta, lineHeight: 17, marginTop: 2 },
  mono: { fontFamily: fonts.mono, fontWeight: "500", fontSize: 12.5, color: colors.inkMuted },
  fix: { flexDirection: "row", gap: 12 },
  fixN: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.ink, color: colors.paper, textAlign: "center", lineHeight: 26, fontFamily: fonts.body, fontWeight: "700", fontSize: 13 },
  cHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  severity: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.amberTint, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  severityText: { fontFamily: fonts.body, fontWeight: "600", fontSize: 11.5, color: colors.amberInk },
  quotes: { gap: 8, marginTop: 10 },
  quote: { backgroundColor: colors.paper, borderRadius: radius.md, padding: 12, gap: 4 },
  manuscript: { borderLeftWidth: 3, borderLeftColor: colors.amber },
  criteria: { gap: 16 },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.paper, marginTop: 6, overflow: "hidden" },
  bar: { height: "100%", borderRadius: 3, backgroundColor: colors.dusk },
  why: { ...type.meta, lineHeight: 17, marginTop: 6, color: colors.inkMuted },
  bars: { flexDirection: "row", alignItems: "flex-end", gap: 12, minHeight: 110 },
  barCol: { flex: 1, alignItems: "center", gap: 4 },
  barValue: { fontFamily: fonts.mono, fontWeight: "500", fontSize: 11, color: colors.inkMuted },
  vbar: { width: "70%", maxWidth: 34, borderRadius: 6, backgroundColor: colors.dusk },
  deliveryRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 14 },
  locked: { flexDirection: "row", alignItems: "center", gap: 12 },
  lockTile: { width: 42, height: 42, borderRadius: radius.md, backgroundColor: colors.paper, alignItems: "center", justifyContent: "center" },
  qHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  qLabel: { fontFamily: fonts.mono, fontWeight: "500", fontSize: 12.5, color: colors.duskLink, width: 36 },
  qBody: { gap: 12, marginTop: 12 },
  chip: { alignSelf: "flex-start", backgroundColor: colors.paper, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, fontFamily: fonts.body, fontWeight: "600", fontSize: 12, color: colors.ink },
  better: { backgroundColor: colors.duskTint, borderRadius: radius.md, padding: 12, gap: 4 },
  betterLocked: { flexDirection: "row", alignItems: "center", gap: 6, height: 40 },
  link: { fontFamily: fonts.body, fontWeight: "600", fontSize: 13.5, color: colors.duskLink },
  line: { flexDirection: "row", gap: 8 },
  dot: { width: 7, height: 7, borderRadius: 3.5, marginTop: 7 },
  face: { marginTop: 1 },
  dotFlag: { backgroundColor: colors.amber },
});
