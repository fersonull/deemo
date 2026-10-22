import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/button";
import { Sheet } from "@/components/sheet";
import { sessions, useSessions, type SessionPayload } from "@/hooks/use-sessions";
import { space, type } from "@/theme";
import { formatTime } from "@/utils/format-time";
import { sessionBackup } from "@/utils/session-backup";

// A session the app never finished sending (killed, phone off, or the upload failed): offered once on Home, as a
// report for what was answered, or discarded. Recovered sessions are scored like ones the student ended early.
export function InterruptedSession() {
  const [backup, setBackup] = useState(() => sessionBackup.load());
  const { submit } = useSessions();
  // Only a leftover from an earlier run: a session submitted in this run is the scoring screen's (it has its own retry),
  // so offering it here could send it twice.
  if (!backup || submit.state !== "idle") return null;

  const report = () => {
    void sessions.submit(backup.payload as SessionPayload); // clears the backup once the server has it
    setBackup(null);
    router.push({ pathname: "/scoring", params: { ms: String(backup.ms), answered: String(backup.answered) } });
  };
  const discard = () => {
    sessionBackup.clear();
    setBackup(null);
  };

  return (
    <Sheet visible onClose={() => setBackup(null)}>
      <Text style={styles.title}>Your last session was interrupted</Text>
      <Text style={styles.body}>
        {`You answered ${backup.answered} ${backup.answered === 1 ? "question" : "questions"} in ${formatTime(backup.ms)} before it stopped. Get a report for those answers, or discard them.`}
      </Text>
      <View style={styles.actions}>
        <Button label="Get my report" onPress={report} />
        <Button label="Discard" variant="secondary" onPress={discard} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  title: { ...type.title, fontSize: 26, lineHeight: 28, letterSpacing: -0.8 },
  body: { ...type.body, marginTop: space.sm },
  actions: { gap: space.sm, marginTop: space.xl },
});
