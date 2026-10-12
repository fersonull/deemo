import { useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";

import { Button } from "@/components/button";
import { Screen } from "@/components/screen";
import { Sheet } from "@/components/sheet";
import { UpsellSheet } from "@/components/upsell-sheet";
import { session, useSession } from "@/hooks/use-session";
import { colors, fonts, radius, type } from "@/theme";
import { api } from "@/utils/api";
import { initials } from "@/utils/initials";
import { shareFile } from "@/utils/share-file";
import { PressableScale } from "@/components/pressable-scale";

const PLANS = {
  free: { name: "Free plan", desc: "Title and Pre-Oral defenses, one panelist, 10-minute sessions, one manuscript." },
  premium: { name: "Premium (demo)", desc: "Every defense stage, up to three panelists, 25-minute sessions, the full report." },
};

// Profile (prototype profile screen): account, plan, the typed-answer setting, download and delete my data, sign out.
// ponytail: panel voice speed and the theme row from the design come later (audio rate, a dark theme).
export function Profile() {
  const { name, email, premium, allowTyping } = useSession();
  const [sheet, setSheet] = useState<"upsell" | "delete" | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const plan = premium ? PLANS.premium : PLANS.free;

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
    <Screen scroll tabBar title="Profile">
      <View style={styles.account}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(name, email)}</Text>
        </View>
        <View style={styles.flex}>
          <Text style={styles.name} numberOfLines={1}>
            {name ?? email ?? "Signed in"}
          </Text>
          {name && email ? (
            <Text style={styles.meta} numberOfLines={1}>
              {email}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.plan}>
        <View style={styles.planHead}>
          <Text style={[styles.planName, styles.flex]}>{plan.name}</Text>
          {!premium ? (
            <PressableScale accessibilityRole="button" onPress={() => setSheet("upsell")} style={styles.upgrade}>
              <Text style={styles.upgradeText}>Upgrade</Text>
            </PressableScale>
          ) : null}
        </View>
        <Text style={styles.planDesc}>{plan.desc}</Text>
      </View>

      <View style={styles.rows}>
        <View style={styles.row}>
          <View style={styles.flex}>
            <Text style={styles.rowLabel}>Allow typed answers</Text>
            <Text style={styles.meta}>{"Shows the keyboard button in sessions, for when you can't speak."}</Text>
          </View>
          <Switch
            accessibilityLabel="Allow typed answers"
            value={allowTyping}
            onValueChange={(v) => void session.setAllowTyping(v)}
            trackColor={{ false: colors.sand, true: colors.dusk }}
            thumbColor={colors.paper}
          />
        </View>
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
        <PressableScale accessibilityRole="button" onPress={() => setSheet("delete")} style={styles.row}>
          <Text style={[styles.rowLabel, styles.danger]}>Delete my data</Text>
        </PressableScale>
        <PressableScale accessibilityRole="button" onPress={() => void session.signOut()} style={styles.row}>
          <Text style={styles.rowLabel}>Sign out</Text>
        </PressableScale>
      </View>

      <UpsellSheet
        visible={sheet === "upsell"}
        onClose={() => setSheet(null)}
        onUpgrade={() => {
          void session.upgrade();
          setSheet(null);
        }}
      />

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
  account: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: 18 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.duskTint,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: fonts.display, fontWeight: "700", fontSize: 20, color: colors.duskInk },
  name: { ...type.heading, fontSize: 18 },
  meta: { ...type.meta, lineHeight: 17, marginTop: 2 },
  plan: { backgroundColor: colors.sand, borderRadius: radius.xl, padding: 16, marginTop: 18 },
  planHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  planName: { ...type.heading },
  upgrade: { height: 34, borderRadius: 17, paddingHorizontal: 14, backgroundColor: colors.ink, justifyContent: "center" },
  upgradeText: { fontFamily: fonts.body, fontWeight: "600", fontSize: 13, color: colors.paper },
  planDesc: { ...type.body, fontSize: 13.5, lineHeight: 20, color: colors.inkMuted, marginTop: 6 },
  rows: { marginTop: 18, borderTopWidth: 1, borderTopColor: colors.border },
  row: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
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
