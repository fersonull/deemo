import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Switch, Text, TextInput, View } from "react-native";

import { Avatar } from "@/components/avatar";
import { CoursePicker } from "@/components/course-picker";
import { AvatarSheet } from "./avatar-sheet";
import { Button } from "@/components/button";
import { Icon } from "@/components/icon";
import { Screen } from "@/components/screen";
import { Sheet } from "@/components/sheet";
import { PremiumCard } from "@/components/premium-card";
import { UpsellSheet } from "@/components/upsell-sheet";
import { refreshEverything } from "@/hooks/refresh-everything";
import { session, useSession } from "@/hooks/use-session";
import { colors, fonts, radius, type } from "@/theme";
import { api } from "@/utils/api";
import { cleanName, MAX_NAME } from "@/utils/auth-form";
import { shareFile } from "@/utils/share-file";
import { PressableScale } from "@/components/pressable-scale";

const FREE_PLAN = "Title and Pre-Oral defenses, one panelist, 10-minute sessions, five sessions a day, one manuscript.";

// Profile (prototype profile screen), top to bottom by importance: who you are (tap the face to pick a look, the name to
// change it), your plan (Premium: a compact card that opens the benefits screen), then grouped settings (course, typed
// answers), your data (download, delete) and sign out.
// ponytail: panel voice speed and the theme row from the design come later (audio rate, a dark theme).
export function Profile() {
  const { name, email, avatar, premium, allowTyping, course } = useSession();
  const [sheet, setSheet] = useState<"upsell" | "delete" | "name" | "avatar" | "course" | null>(null);
  const [courseError, setCourseError] = useState("");
  const [draft, setDraft] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  const deleteAll = async () => {
    setDeleting(true);
    setError("");
    try {
      await session.deleteEverything(); // signs out; the root layout returns to the welcome screen
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't delete your data. Try again.");
      setDeleting(false);
    }
  };

  const editName = () => {
    setDraft(name ?? "");
    setNameError("");
    setSheet("name");
  };

  const saveName = async () => {
    setSavingName(true);
    setNameError("");
    try {
      await session.setName(draft);
      setSheet(null);
    } catch {
      setNameError("Couldn't save your name. Check your connection and try again.");
    } finally {
      setSavingName(false);
    }
  };

  // Download my data (plan §17 user rights): everything the server keeps, as one JSON file through the share sheet.
  const download = async () => {
    setDownloading(true);
    setDownloadError("");
    try {
      const data = await api<object>("/me/export");
      await shareFile("DEEMO my data.json", "application/json", { text: JSON.stringify(data, null, 2) });
    } catch {
      setDownloadError("Couldn't get your data. Try again.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Screen scroll tabBar title="Profile" onRefresh={refreshEverything}>
      <View style={styles.account}>
        <PressableScale
          scaleTo={0.95}
          accessibilityRole="button"
          accessibilityLabel="Your avatar"
          accessibilityHint="Pick your look"
          onPress={() => setSheet("avatar")}
        >
          <Avatar seed={avatar} name={name} email={email} size={64} premium={premium} />
          <View style={styles.avatarBadge}>
            <Icon name="edit" size={12} color={colors.paper} />
          </View>
        </PressableScale>
        <PressableScale
          scaleTo={0.98}
          accessibilityRole="button"
          accessibilityHint={name ? "Change your name" : "Add your name"}
          onPress={editName}
          style={styles.nameRow}
        >
          <View style={styles.flex}>
            <Text style={styles.name} numberOfLines={1}>
              {name ?? email ?? "Signed in"}
            </Text>
            {name && email ? (
              <Text style={styles.meta} numberOfLines={1}>
                {email}
              </Text>
            ) : !name ? (
              <Text style={[styles.meta, styles.addName]}>Add your name</Text>
            ) : null}
          </View>
          <Icon name="edit" size={18} color={colors.muted} />
        </PressableScale>
      </View>

      {premium ? (
        <View style={styles.planCard}>
          <PremiumCard onPress={() => router.push("/premium")} />
        </View>
      ) : (
        <View style={styles.plan}>
          <View style={styles.planHead}>
            <Text style={[styles.planName, styles.flex]}>Free plan</Text>
            <PressableScale accessibilityRole="button" onPress={() => setSheet("upsell")} style={styles.upgrade}>
              <Text style={styles.upgradeText}>Upgrade</Text>
            </PressableScale>
          </View>
          <Text style={styles.planDesc}>{FREE_PLAN}</Text>
        </View>
      )}

      <Text style={[type.label, styles.section]}>SETTINGS</Text>
      <View style={styles.group}>
        <PressableScale
          accessibilityRole="button"
          accessibilityHint="Change your course"
          onPress={() => {
            setCourseError("");
            setSheet("course");
          }}
          style={styles.row}
        >
          <View style={styles.flex}>
            <Text style={styles.rowLabel}>Course</Text>
            <Text style={styles.meta}>{course ?? "Not set"}</Text>
          </View>
          <Icon name="chevron_right" size={20} color={colors.muted} />
        </PressableScale>
        <View style={[styles.row, styles.divider]}>
          <View style={styles.flex}>
            <Text style={styles.rowLabel}>Allow typed answers</Text>
            <Text style={styles.meta}>{"Shows the keyboard button in sessions, for when you can't speak."}</Text>
          </View>
          <Switch
            accessibilityLabel="Allow typed answers"
            value={allowTyping}
            onValueChange={(v) => void session.setAllowTyping(v)}
            trackColor={{ false: colors.faint, true: colors.dusk }}
            thumbColor={colors.paper}
          />
        </View>
      </View>

      <Text style={[type.label, styles.section]}>YOUR DATA</Text>
      <View style={styles.group}>
        <PressableScale
          accessibilityRole="button"
          accessibilityState={{ busy: downloading }}
          disabled={downloading}
          onPress={download}
          style={styles.row}
        >
          <View style={styles.flex}>
            <Text style={styles.rowLabel}>{downloading ? "Getting your data…" : "Download my data"}</Text>
            <Text style={styles.meta} accessibilityLiveRegion="polite">
              {downloadError || "Your manuscripts' summaries, transcripts and reports, as one file."}
            </Text>
          </View>
        </PressableScale>
        <PressableScale accessibilityRole="button" onPress={() => setSheet("delete")} style={[styles.row, styles.divider]}>
          <Text style={[styles.rowLabel, styles.danger]}>Delete my data</Text>
        </PressableScale>
      </View>

      <View style={styles.signOut}>
        <Button variant="secondary" label="Sign out" onPress={() => void session.signOut()} />
      </View>

      <UpsellSheet
        visible={sheet === "upsell"}
        onClose={() => setSheet(null)}
        onUpgrade={() => {
          void session.upgrade();
          setSheet(null);
        }}
      />

      <AvatarSheet
        visible={sheet === "avatar"}
        onClose={() => setSheet(null)}
        current={avatar}
        premium={premium}
        name={name}
        email={email}
      />

      <Sheet visible={sheet === "course"} onClose={() => setSheet(null)}>
        <Text style={styles.sheetTitle}>Your course</Text>
        <Text style={styles.sheetBody}>
          {"Used when you practice without a manuscript. With one, the panel follows the manuscript's field."}
        </Text>
        <View style={styles.coursePicker}>
          <CoursePicker
            value={course}
            onPick={(c) => {
              setCourseError("");
              session
                .setCourse(c)
                .then(() => setSheet(null))
                .catch(() => setCourseError("Couldn't save your course. Check your connection and try again."));
            }}
          />
        </View>
        {courseError ? (
          <Text style={styles.nameError} accessibilityLiveRegion="polite">
            {courseError}
          </Text>
        ) : null}
      </Sheet>

      <Sheet visible={sheet === "name"} onClose={() => !savingName && setSheet(null)}>
        <Text style={styles.sheetTitle}>Your name</Text>
        <Text style={styles.sheetBody}>Deemo greets you by it, and your group sees it next to your score.</Text>
        <View style={styles.field}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Juan Dela Cruz"
            placeholderTextColor={colors.faint}
            autoCapitalize="words"
            autoComplete="name"
            autoFocus
            maxLength={MAX_NAME}
            returnKeyType="done"
            onSubmitEditing={() => cleanName(draft) && void saveName()}
            accessibilityLabel="Your name"
            style={styles.input}
          />
        </View>
        {nameError ? (
          <Text style={styles.nameError} accessibilityLiveRegion="polite">
            {nameError}
          </Text>
        ) : null}
        <View style={styles.saveName}>
          <Button
            label={savingName ? "Saving…" : "Save"}
            onPress={saveName}
            busy={savingName}
            disabled={savingName || !cleanName(draft) || cleanName(draft) === name}
          />
        </View>
      </Sheet>

      <Sheet visible={sheet === "delete"} onClose={() => !deleting && setSheet(null)}>
        <Text style={styles.sheetTitle}>Delete all your data?</Text>
        <Text style={styles.sheetBody}>
          {
            "This removes your manuscripts, transcripts, scores and account. Groups you lead are dissolved; teammates keep their own past sessions. It can't be undone."
          }
        </Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PressableScale
          accessibilityRole="button"
          accessibilityState={{ disabled: deleting }}
          disabled={deleting}
          onPress={deleteAll}
          style={[styles.deleteButton, deleting && styles.dim]}
        >
          <Text style={styles.deleteText}>{deleting ? "Deleting…" : "Delete everything"}</Text>
        </PressableScale>
        <View style={styles.cancel}>
          <Button variant="secondary" label="Keep my data" onPress={() => setSheet(null)} disabled={deleting} />
        </View>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  account: { flexDirection: "row", alignItems: "center", gap: 16, marginTop: 18, paddingRight: 4 },
  nameRow: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56 },
  avatarBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.paper,
    backgroundColor: colors.dusk,
    alignItems: "center",
    justifyContent: "center",
  },
  addName: { color: colors.duskLink, fontWeight: "600" },
  field: { marginTop: 16, backgroundColor: colors.sand, borderRadius: radius.lg, paddingVertical: 10, paddingHorizontal: 16 },
  input: { ...type.bodyStrong, fontSize: 15, paddingVertical: 4, paddingHorizontal: 0 },
  nameError: { ...type.body, fontSize: 13, color: colors.warnInk, marginTop: 10, paddingHorizontal: 4 },
  saveName: { marginTop: 16 },
  coursePicker: { marginTop: 16 },
  name: { ...type.heading, fontSize: 20, letterSpacing: -0.3 },
  meta: { ...type.meta, lineHeight: 17, marginTop: 2 },
  planCard: { marginTop: 20 },
  plan: { backgroundColor: colors.sand, borderRadius: radius.xl, padding: 16, marginTop: 20 },
  planHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  planName: { ...type.heading },
  upgrade: { height: 34, borderRadius: 17, paddingHorizontal: 14, backgroundColor: colors.ink, justifyContent: "center" },
  upgradeText: { fontFamily: fonts.body, fontWeight: "600", fontSize: 13, color: colors.paper },
  planDesc: { ...type.body, fontSize: 13.5, lineHeight: 20, color: colors.inkMuted, marginTop: 6 },
  section: { marginTop: 26, marginBottom: 8, paddingHorizontal: 4 },
  group: { backgroundColor: colors.sand, borderRadius: radius.xl, paddingHorizontal: 16 },
  row: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  signOut: { marginTop: 26 },
  rowLabel: { fontFamily: fonts.body, fontWeight: "500", fontSize: 14.5, color: colors.ink },
  danger: { color: colors.clay },
  sheetTitle: { ...type.title, fontSize: 26, lineHeight: 28, letterSpacing: -0.8 },
  sheetBody: { ...type.body, color: colors.inkMuted, marginTop: 8 },
  error: { ...type.body, fontSize: 13, color: colors.clay, marginTop: 10 },
  deleteButton: {
    height: 58,
    borderRadius: radius.pill,
    backgroundColor: colors.clay,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  deleteText: { ...type.button, color: colors.paper },
  dim: { opacity: 0.6 },
  cancel: { marginTop: 8 },
});
