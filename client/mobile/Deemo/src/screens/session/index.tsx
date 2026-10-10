import { useKeepAwake } from "expo-keep-awake";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { BackHandler, KeyboardAvoidingView, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/button";
import { Icon } from "@/components/icon";
import { Sheet } from "@/components/sheet";
import { MODE_LABELS } from "@/constants";
import { useLiveSession } from "@/hooks/use-live-session";
import { usePracticeSetup } from "@/hooks/use-practice-setup";
import { useSession } from "@/hooks/use-session";
import { sessions } from "@/hooks/use-sessions";
import { colors, fonts, type } from "@/theme";
import { formatTime } from "@/utils/format-time";

import { MicButton } from "./mic-button";
import { Panelist, type PanelistStatus } from "./panelist";
import { PausedOverlay } from "./paused-overlay";
import { QuestionCard } from "./question-card";
import { Transcript } from "./transcript";

// Live session (screen 11). Sparse like a real panel: no pop-ups, no red (brief).
export function Session() {
  useKeepAwake();
  const setup = usePracticeSetup();
  const { allowTyping } = useSession(); // Profile setting
  const { state: s, finishTurn, sendText, pause, resume, stop } = useLiveSession();
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [heldBySheet, setHeldBySheet] = useState(false);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState("");

  const count = setup.panelists;
  const time = formatTime(s.sessionMs);
  const answered = s.turns.length;

  // The confirm sheet freezes the session (no overlay); "Keep going" picks up where it stopped.
  const askEnd = () => {
    if (!s.paused) {
      setHeldBySheet(true);
      pause();
    }
    setConfirmEnd(true);
  };
  const keepGoing = () => {
    setConfirmEnd(false);
    if (heldBySheet) resume();
    setHeldBySheet(false);
  };

  const leave = (endedBy: "panel" | "student" = "student") => {
    stop();
    sessions.submitLive(s, endedBy); // scored on the server; the scoring screen waits for it
    router.replace({ pathname: "/scoring", params: { ms: String(s.sessionMs), answered: String(answered) } });
  };

  useEffect(() => {
    if (s.phase === "ended") leave("panel");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- leave once, when the panel closes
  }, [s.phase]);

  // Android back asks before leaving, like the End button.
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      askEnd();
      return true;
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- askEnd reads current state when pressed
  }, [s.paused]);

  const asker = s.question ? s.question.panelist % count : 0;
  const status = (i: number): PanelistStatus => {
    if (s.phase === "connecting") return "offline";
    if (s.phase === "speaking" && i === asker) return "speaking";
    if (s.phase === "ending" && i === 0) return "speaking";
    if (s.phase === "thinking" && i === asker) return "thinking";
    return "listening";
  };

  const frozen = s.paused || s.reconnecting;
  const studentTurn = (s.phase === "listening" || s.phase === "presentation") && !frozen;
  const micLabel =
    s.phase === "listening"
      ? `${formatTime(s.responseMs)} · tap when done`
      : s.phase === "presentation"
        ? "presenting · tap when done"
        : s.phase === "speaking"
          ? "panel speaking"
          : s.phase === "thinking"
            ? "…"
            : "";
  const closing = s.partial && s.phase === "ending" ? s.partial.text : (s.lines.at(-1)?.text ?? "");

  const send = () => {
    sendText(draft);
    setDraft("");
    setTyping(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior="padding" style={styles.flex}>
        <View style={styles.top}>
          <View style={styles.stage}>
            <Text style={styles.stageText}>{MODE_LABELS[setup.mode]}</Text>
            <Text style={styles.time} accessibilityLabel={`Session time ${time}`}>
              {time}
            </Text>
          </View>
          <Pressable accessibilityRole="button" onPress={askEnd} style={styles.endBtn}>
            <Text style={styles.endText}>End</Text>
          </Pressable>
        </View>

        {s.reconnecting && (
          <View style={styles.banner} accessibilityLiveRegion="polite">
            <Icon name="progress_activity" size={20} color={colors.duskIcon} />
            <Text style={styles.bannerText}>Reconnecting… your progress is safe.</Text>
          </View>
        )}

        <View style={[styles.panel, { gap: count === 1 ? 0 : 6 }]}>
          {Array.from({ length: count }, (_, i) => (
            <Panelist key={i} index={i} status={status(i)} count={count} />
          ))}
        </View>

        <QuestionCard phase={s.phase} question={s.question} closing={closing} count={count} onDonePresenting={finishTurn} />

        <Transcript lines={s.lines} partial={s.partial} coach={setup.coach} />

        {typing && (
          <View style={styles.typeRow}>
            <TextInput
              autoFocus
              value={draft}
              onChangeText={setDraft}
              placeholder="Type your answer…"
              placeholderTextColor={colors.faint}
              style={styles.input}
              onSubmitEditing={send}
              accessibilityLabel="Typed answer"
            />
            <Pressable accessibilityRole="button" accessibilityLabel="Send answer" onPress={send} style={styles.sendBtn}>
              <Icon name="arrow_upward" size={20} color={colors.paper} />
            </Pressable>
          </View>
        )}

        <View style={styles.bottom}>
          <Pressable accessibilityRole="button" accessibilityLabel="Pause" onPress={pause} style={styles.round}>
            <Icon name="pause" size={26} filled />
          </Pressable>
          <View style={styles.micCol}>
            <MicButton
              active={studentTurn}
              muted={s.phase === "speaking"}
              level={s.level}
              label={s.phase === "presentation" ? "Done presenting" : "Done answering"}
              onPress={finishTurn}
            />
            <Text style={styles.micLabel}>{micLabel}</Text>
          </View>
          {allowTyping ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Type an answer instead"
              accessibilityState={{ expanded: typing }}
              onPress={() => setTyping(!typing)}
              style={[styles.round, typing && { backgroundColor: colors.duskTint }]}
            >
              <Icon name="keyboard" size={24} />
            </Pressable>
          ) : (
            <View style={styles.roundSpacer} /> // keeps the mic centered
          )}
        </View>
      </KeyboardAvoidingView>

      {s.paused && !heldBySheet && <PausedOverlay time={time} onResume={resume} onEnd={askEnd} />}

      <Sheet visible={confirmEnd} onClose={keepGoing}>
        <Text style={styles.sheetTitle}>End the session early?</Text>
        <Text style={styles.sheetBody}>
          {`You'll still get a report for the ${answered} ${answered === 1 ? "question" : "questions"} you've answered.`}
        </Text>
        <View style={styles.sheetCta}>
          <Button label="End and see report" onPress={() => leave("student")} />
        </View>
        <Pressable accessibilityRole="button" onPress={keepGoing} style={styles.keepGoing}>
          <Text style={[type.button, styles.keepGoingText]}>Keep going</Text>
        </Pressable>
      </Sheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  flex: { flex: 1 },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 8, paddingLeft: 18, paddingRight: 14 },
  stage: { height: 36, borderRadius: 18, backgroundColor: colors.sand, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14 },
  stageText: { fontFamily: fonts.body, fontWeight: "600", fontSize: 13, color: colors.ink },
  time: { fontFamily: fonts.mono, fontWeight: "500", fontSize: 13, color: colors.inkMuted, fontVariant: ["tabular-nums"] },
  endBtn: { height: 48, paddingHorizontal: 18, borderRadius: 24, backgroundColor: colors.sand, justifyContent: "center" },
  endText: { fontFamily: fonts.body, fontWeight: "600", fontSize: 13, color: colors.ink },
  banner: {
    marginTop: 10,
    marginHorizontal: 14,
    backgroundColor: colors.banner,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  bannerText: { ...type.body, fontSize: 13, fontWeight: "500" },
  panel: { flexDirection: "row", justifyContent: "center", alignItems: "flex-end", paddingTop: 24, paddingHorizontal: 14 },
  typeRow: { flexDirection: "row", gap: 8, marginHorizontal: 14, marginBottom: 8 },
  input: { ...type.body, flex: 1, height: 48, borderRadius: 24, backgroundColor: colors.sand, paddingHorizontal: 16 },
  sendBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" },
  bottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 4, paddingHorizontal: 18, paddingBottom: 16 },
  roundSpacer: { width: 56, height: 56 },
  round: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.sand, alignItems: "center", justifyContent: "center" },
  micCol: { alignItems: "center", gap: 6 },
  micLabel: { fontFamily: fonts.mono, fontWeight: "500", fontSize: 12, color: colors.inkMuted, height: 16 },
  sheetTitle: { ...type.title, fontSize: 26, lineHeight: 28, letterSpacing: -0.8 },
  sheetBody: { ...type.body, color: colors.inkMuted, marginTop: 8 },
  sheetCta: { marginTop: 20 },
  keepGoing: { height: 48, alignItems: "center", justifyContent: "center", marginTop: 4 },
  keepGoingText: { fontSize: 14, color: colors.ink },
});
