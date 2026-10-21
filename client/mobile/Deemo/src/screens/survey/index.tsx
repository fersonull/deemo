import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/button";
import { CoursePicker } from "@/components/course-picker";
import { Screen } from "@/components/screen";
import { type Course } from "@/constants";
import { session } from "@/hooks/use-session";
import { colors, type } from "@/theme";
import { ApiError } from "@/utils/api";

// Onboarding survey, after consent: the student's course, which profiles the panel (Adaptive Domain Profiling, plan
// F4). Saved on the account; the root layout then moves on to the app. Editable in Profile.
export function Survey() {
  const [course, setCourse] = useState<Course | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    if (!course) return;
    setBusy(true);
    setError("");
    try {
      await session.setCourse(course);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't save your course. Check your connection and try again.");
      setBusy(false);
    }
  };

  return (
    <Screen title={"What's your\ncourse?"} subtitle="The panel asks what a panel in your field would ask. You can change it in Profile.">
      <View style={styles.picker}>
        <CoursePicker value={course} onPick={setCourse} />
      </View>
      <View style={styles.spacer} />
      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
      <Button label={busy ? "Saving…" : "Continue"} busy={busy} disabled={!course || busy} onPress={save} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  picker: { marginTop: 24 },
  spacer: { flex: 1, minHeight: 24 },
  error: { ...type.body, fontSize: 13, color: colors.warnInk, marginBottom: 10, textAlign: "center" },
});
