import { PressableScale } from "@/components/pressable-scale";
import { useKeepAwake } from "expo-keep-awake";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { BackHandler, KeyboardAvoidingView, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { FadeIn, FadeOut, LinearTransition } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/button";
import { Icon } from "@/components/icon";
import { Sheet } from "@/components/sheet";
import { MODE_LABELS, lineup, profileCourse } from "@/constants";
import { useLiveSession } from "@/hooks/use-live-session";
import { usePracticeSetup } from "@/hooks/use-practice-setup";
import { useProjects } from "@/hooks/use-projects";
import { useSession } from "@/hooks/use-session";
import { sessions } from "@/hooks/use-sessions";
import { colors, easeOut, fonts, type } from "@/theme";
import { formatTime } from "@/utils/format-time";

import { MicButton } from "./mic-button";
import { Panelist, type PanelistStatus } from "./panelist";
import { PausedOverlay } from "./paused-overlay";
import { QuestionCard } from "./question-card";
import { Transcript } from "./transcript";

// When the reconnecting banner comes and goes, the panel and question glide instead of jumping.
const GLIDE = LinearTransition.duration(200).easing(easeOut);

// Live session (screen 11). Sparse like a real panel: no pop-ups, no red (brief).
export function Session() {
  useKeepAwake();
  const setup = usePracticeSetup();
  const { allowTyping, course } = useSession(); // Profile settings
  // Who sits in each seat, fixed for the whole session: the manuscript's field decides, else the course (constants.ts lineup).
  const manuscript = useProjects().projects.find((p) => p.id === setup.projectId);
  const field = profileCourse(manuscript, course);
  const [seats] = useState(() => lineup(field, setup.panelists));
  const { state: s, finishTurn, sendText, pause, resume, stop } = useLiveSession(seats);
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

  const leave = (endedBy: "panel" | "student" | "time" = s.endedBy === "time" ? "time" : "student") => {
    stop();
    sessions.submitLive(s, endedBy, seats); // scored on the server; the scoring screen waits for it
    router.replace({ pathname: "/scoring", params: { ms: String(s.sessionMs), answered: String(answered) } });
  };

  useEffect(() => {
    if (s.phase === "ended") leave(s.endedBy);
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

  // A contradiction flag: the asker looks skeptical for a few seconds (speaking and thinking win over it).
  const [skepticalFlags, setSkepticalFlags] = useState(0);
  useEffect(() => {
    if (!s.flags.length) return;
    const t = setTimeout(() => setSkepticalFlags(s.flags.length), 4000);
    return () => clearTimeout(t);
  }, [s.flags.length]);
  const skeptical = s.flags.length > skepticalFlags;

  // Who holds the floor: the asker, or the panelist who just took over (they question in turn) or is closing.
  const asker = s.takeover || s.phase === "ending" || !s.question ? s.seat % count : s.question.panelist % count;
  const status = (i: number): PanelistStatus => {
    if (s.phase === "connecting") return "offline";
    if (s.phase === "speaking" && i === asker) return "speaking";
    if (s.phase === "ending" && i === asker) return "speaking";
    if (s.phase === "thinking" && i === asker) return "thinking";
    if (skeptical && i === asker) return "skeptical";
    return "listening";
  };
  const listeningLevel = s.phase === "listening" || s.phase === "presentation" ? s.level : 0;

  const frozen = s.paused || s.reconnecting || !!s.error;
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
  const closing =
    s.partial && s.phase === "ending" && s.partial.who !== "you"
      ? s.partial.text
      : s.endedBy === "time"
        ? "Time is up. The panel is closing your practice."
        : (s.lines.at(-1)?.text ?? "");

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
          <PressableScale accessibilityRole="button" onPress={askEnd} style={styles.endBtn}>
            <Text style={styles.endText}>End</Text>
          </PressableScale>
        </View>

        {s.reconnecting && (
          <Animated.View
            entering={FadeIn.duration(200).easing(easeOut)}
            exiting={FadeOut.duration(150)}
            style={styles.banner}
            accessibilityLiveRegion="polite"
          >
            <Icon name="progress_activity" size={20} color={colors.duskIcon} />
            <Text style={styles.bannerText}>Reconnecting… your progress is safe.</Text>
          </Animated.View>
        )}

        <Animated.View layout={GLIDE} style={[styles.panel, { gap: count === 1 ? 0 : 6 }]}>
          {Array.from({ length: count }, (_, i) => (
            <Panelist key={i} persona={seats[i]!} course={field} status={status(i)} count={count} level={listeningLevel} />
          ))}
        </Animated.View>

        <Animated.View layout={GLIDE}>
          <QuestionCard
          phase={s.phase}
          question={s.question}
          takeover={s.takeover ? s.seat % count : null}
          seats={seats}
          course={field}
          closing={closing}
          count={count}
          followUpLimit={s.followUpLimit}
          onDonePresenting={finishTurn}
          />
        </Animated.View>

        <Transcript lines={s.lines} partial={s.partial} seats={seats} />

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
            <PressableScale layered accessibilityRole="button" accessibilityLabel="Send answer" onPress={send} style={styles.sendBtn}>
              <Icon name="arrow_upward" size={20} color={colors.paper} />
            </PressableScale>
          </View>
        )}

        <View style={styles.bottom}>
          <PressableScale accessibilityRole="button" accessibilityLabel="Pause" disabled={s.phase === "ending"} onPress={pause} style={styles.round}>
            <Icon name="pause" size={26} filled />
          </PressableScale>
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
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel="Type an answer instead"
              accessibilityState={{ expanded: typing }}
              disabled={s.phase === "ending"}
              onPress={() => setTyping(!typing)}
              style={[styles.round, typing && { backgroundColor: colors.duskTint }]}
            >
              <Icon name="keyboard" size={24} />
            </PressableScale>
          ) : (
            <View style={styles.roundSpacer} /> // keeps the mic centered
          )}
        </View>
      </KeyboardAvoidingView>

      {s.paused && !heldBySheet && <PausedOverlay time={time} onResume={resume} onEnd={askEnd} />}

      <Sheet visible={!!s.error} onClose={() => s.phase === "connecting" ? router.replace("/practice") : leave()}>
        <Text style={styles.sheetTitle}>{s.phase === "connecting" ? "Couldn't start practice" : "Practice stopped"}</Text>
        <Text style={styles.sheetBody} accessibilityLiveRegion="polite">{s.error}</Text>
        <View style={styles.sheetCta}>
          <Button
            label={s.phase === "connecting" ? "Back to setup" : "Save and see report"}
            onPress={() => s.phase === "connecting" ? router.replace("/practice") : leave()}
          />
        </View>
      </Sheet>

      <Sheet visible={confirmEnd} onClose={keepGoing}>
        <Text style={styles.sheetTitle}>End the session early?</Text>
        <Text style={styles.sheetBody}>
          {`You'll still get a report for the ${answered} ${answered === 1 ? "question" : "questions"} you've answered.`}
        </Text>
        <View style={styles.sheetCta}>
          <Button label="End and see report" onPress={() => leave()} />
        </View>
        <PressableScale accessibilityRole="button" onPress={keepGoing} style={styles.keepGoing}>
          <Text style={[type.button, styles.keepGoingText]}>Keep going</Text>
        </PressableScale>
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
