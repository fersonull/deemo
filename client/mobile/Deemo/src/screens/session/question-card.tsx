import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";

import { Icon } from "@/components/icon";
import { PanelFace } from "@/components/panel-face";
import { PANEL, panelLabel, type Course } from "@/constants";
import type { Phase, Question, QuestionType } from "@/live/types";
import { colors, fonts, type } from "@/theme";
import { riseIn } from "@/utils/motion";

// Question-Type Indicator (plan F9): label + icon, never color alone.
const TYPES: Record<QuestionType, { label: string; icon: string }> = {
  TECHNICAL: { label: "Technical", icon: "memory" },
  METHODOLOGICAL: { label: "Methodological", icon: "science" },
  CONCEPTUAL: { label: "Conceptual", icon: "lightbulb" },
  CLARIFICATORY: { label: "Clarificatory", icon: "help" },
};

type Props = {
  phase: Phase;
  question: Question | null;
  closing: string;
  takeover: number | null; // a new panelist is taking over (they question in turn): their seat
  seats: number[]; // the persona in each seat
  course: Course | null;
  count: number;
  followUpLimit: number;
  onDonePresenting: () => void;
};

export function QuestionCard({ phase, question, closing, takeover, seats, course, count, followUpLimit, onDonePresenting }: Props) {
  const takingOver = takeover !== null && phase === "thinking";
  // While a new panelist takes over, the old question's chips and asker would be wrong: only the takeover line shows.
  const showQuestion = question && !takingOver && phase !== "connecting" && phase !== "presentation" && phase !== "ending" && phase !== "ended";
  const text =
    takingOver
      ? `${PANEL[seats[takeover] ?? 0]?.name} is taking over…`
      : phase === "connecting"
      ? "Getting the panel ready…"
      : phase === "presentation"
        ? "Present your study. Tap Done when you're finished."
        : phase === "ending" || phase === "ended"
          ? closing
          : (question?.text ?? "");
  const size = text.length > 170 ? [17, 22] : text.length > 110 ? [19, 24] : [21, 25];
  const askerPersona = question ? (seats[question.panelist % count] ?? 0) : null;
  const asker = askerPersona === null ? null : { name: PANEL[askerPersona]!.name, role: panelLabel(askerPersona, course) };
  const reduced = useReducedMotion();

  return (
    <Animated.View
      key={showQuestion ? `${question.number}.${question.followUp}${question.challenge ? "c" : ""}` : phase}
      entering={riseIn(0, reduced)} // each new question rises in, 250 ms ease-out
      style={styles.card}
    >
      {showQuestion && (
        <>
          <View style={styles.meta}>
            <View style={styles.chips}>
              <View style={styles.chip}>
                <Icon name={TYPES[question.type].icon} size={14} />
                <Text style={styles.chipText}>{TYPES[question.type].label}</Text>
              </View>
              {question.isFollowUp && !question.challenge && (
                <View style={[styles.chip, styles.followUp]}>
                  <Icon name="subdirectory_arrow_right" size={14} color={colors.duskInk} />
                  <Text style={[styles.chipText, { color: colors.duskInk }]}>
                    Follow-up {question.followUp} of {followUpLimit}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.counter}>Q{question.number}</Text>
          </View>
          {asker && (
            <View style={styles.asker}>
              <PanelFace index={askerPersona ?? 0} size={22} still />
              <Text style={styles.askerText}>
                {asker.name} · {asker.role} asks
              </Text>
            </View>
          )}
        </>
      )}
      <ScrollView style={styles.textScroll} nestedScrollEnabled>
        <Text style={[styles.text, { fontSize: size[0], lineHeight: size[1] }]}>{text}</Text>
      </ScrollView>
      {phase === "presentation" && (
        <Pressable accessibilityRole="button" onPress={onDonePresenting} style={styles.done}>
          <Text style={[type.button, styles.doneText]}>Done presenting</Text>
        </Pressable>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 16, marginHorizontal: 14, backgroundColor: colors.sand, borderRadius: 26, paddingTop: 16, paddingHorizontal: 18, paddingBottom: 18 },
  meta: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 10 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, flex: 1 },
  chip: { height: 26, borderRadius: 13, backgroundColor: colors.paper, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", gap: 5 },
  followUp: { backgroundColor: colors.duskTint },
  chipText: { fontFamily: fonts.body, fontWeight: "600", fontSize: 11.5, color: colors.ink },
  counter: { fontFamily: fonts.mono, fontWeight: "500", fontSize: 11, color: colors.muted },
  asker: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  askerText: { fontFamily: fonts.body, fontWeight: "600", fontSize: 12, color: colors.inkMuted },
  textScroll: { maxHeight: 150, flexGrow: 0 },
  text: { fontFamily: fonts.display, fontWeight: "700", letterSpacing: -0.3, color: colors.ink },
  done: { alignSelf: "flex-start", marginTop: 14, height: 44, paddingHorizontal: 20, borderRadius: 22, backgroundColor: colors.ink, justifyContent: "center" },
  doneText: { fontSize: 14, color: colors.paper },
});
