import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { Icon } from "@/components/icon";
import { PressableScale } from "@/components/pressable-scale";
import { MODE_LABELS } from "@/constants";
import type { SessionSummary } from "@/hooks/use-sessions";
import { colors, fonts, type } from "@/theme";
import { bandOf } from "@/utils/bands";
import { defensePath, type StageProgress } from "@/utils/defense-path";

const MARK = 30;

function meta(s: StageProgress) {
  if (s.state === "ready") return `Defense-ready · best ${s.best}`;
  if (s.state === "practicing")
    return [s.best !== null ? `${bandOf(s.best).name} · best ${s.best}` : "Not scored yet", `${s.sessions} ${s.sessions === 1 ? "session" : "sessions"}`].join(" · ");
  return s.current ? "Start here" : "Not started";
}

// Defense Path (issue #13): Title → Pre-Oral → Final, how far along each stage is, and which one to work on next.
// A stage opens History filtered to it.
export function DefensePath({ sessions }: { sessions: SessionSummary[] }) {
  const stages = defensePath(sessions);
  return (
    <View>
      {stages.map((s, i) => {
        const ready = s.state === "ready";
        const linkReady = ready && stages[i + 1] !== undefined;
        return (
          <PressableScale
            key={s.mode}
            scaleTo={0.98}
            accessibilityRole="button"
            accessibilityLabel={`${MODE_LABELS[s.mode]}, step ${i + 1} of 3. ${meta(s)}.${s.current ? " Your next stage." : ""}`}
            accessibilityHint="Opens your history for this stage"
            onPress={() => router.push({ pathname: "/history", params: { stage: s.mode } })}
            style={styles.row}
          >
            <View style={styles.rail}>
              {i > 0 ? <View style={[styles.line, styles.lineTop, stages[i - 1]!.state === "ready" && styles.lineDone]} /> : null}
              <View style={[styles.mark, ready ? styles.markReady : s.current ? styles.markCurrent : styles.markIdle]}>
                {ready ? (
                  <Icon name="check" size={18} color={colors.paper} />
                ) : (
                  <Text style={[styles.step, s.current && styles.stepCurrent]}>{i + 1}</Text>
                )}
              </View>
              {i < stages.length - 1 ? <View style={[styles.line, styles.lineBottom, linkReady && styles.lineDone]} /> : null}
            </View>
            <View style={styles.flex}>
              <Text style={[styles.title, s.state === "not-started" && !s.current && styles.idle]}>{MODE_LABELS[s.mode]}</Text>
              <Text style={[styles.meta, s.current && styles.metaCurrent]} numberOfLines={1}>
                {meta(s)}
              </Text>
            </View>
            <Icon name="chevron_right" size={20} color={colors.muted} />
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, height: 62 },
  rail: { width: MARK, alignSelf: "stretch", alignItems: "center", justifyContent: "center" },
  line: { position: "absolute", width: 2, backgroundColor: colors.border },
  lineTop: { top: 0, bottom: "50%", marginBottom: MARK / 2 },
  lineBottom: { top: "50%", bottom: 0, marginTop: MARK / 2 },
  lineDone: { backgroundColor: colors.sage },
  mark: { width: MARK, height: MARK, borderRadius: MARK / 2, alignItems: "center", justifyContent: "center" },
  markReady: { backgroundColor: colors.sage },
  markCurrent: { backgroundColor: colors.paper, borderWidth: 2, borderColor: colors.dusk },
  markIdle: { backgroundColor: colors.sand },
  step: { fontFamily: fonts.body, fontWeight: "600", fontSize: 13, color: colors.inkMuted },
  stepCurrent: { color: colors.duskInk },
  title: { fontFamily: fonts.body, fontWeight: "500", fontSize: 14.5, color: colors.ink },
  idle: { color: colors.inkMuted },
  meta: { ...type.meta, marginTop: 2 },
  metaCurrent: { color: colors.duskLink },
});
