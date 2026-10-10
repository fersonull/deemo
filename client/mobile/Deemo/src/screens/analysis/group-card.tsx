import { useState } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { Button } from "@/components/button";
import { Sheet } from "@/components/sheet";
import { Icon } from "@/components/icon";
import { projects, type Project } from "@/hooks/use-projects";
import { colors, fonts, radius, type } from "@/theme";

export function GroupCard({ project, onLeft }: { project: Project; onLeft: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);
  const group = project.group;
  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save. Try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Icon name="group" color={colors.duskIcon} />
        <Text style={type.heading}>Your capstone group</Text>
      </View>
      {group ? (
        <>
          <Text style={styles.note}>
            {group.isOwner
              ? "Give this code to your teammates. Anyone with it can join and read the manuscript."
              : "Your leader keeps the shared manuscript and rubric up to date."}
          </Text>
          <Text selectable accessibilityLabel={`Join code ${group.code.split("").join(" ")}`} style={styles.code}>
            {group.code}
          </Text>
          <View style={styles.row}>
            <View style={styles.flex}>
              <Text style={type.bodyStrong}>Share with group</Text>
              <Text style={styles.note}>Show my latest readiness score. My transcript and report stay private.</Text>
            </View>
            <Switch
              accessibilityLabel="Share my latest score with group"
              value={group.shareScore}
              disabled={busy}
              onValueChange={(shareScore) => void run(() => projects.updateMember(project, { shareScore }))}
              trackColor={{ false: colors.border, true: colors.dusk }}
              thumbColor={colors.paper}
            />
          </View>
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => setConfirm(true)} style={styles.action}>
            <Text style={styles.link}>{group.isOwner ? "Stop sharing this project" : "Leave group"}</Text>
          </Pressable>
          <Sheet visible={confirm} onClose={() => !busy && setConfirm(false)}>
            <Text style={type.title}>{group.isOwner ? "Stop sharing?" : "Leave this group?"}</Text>
            <Text style={styles.note}>
              {group.isOwner
                ? "Your teammates lose access to the manuscript and rubric. Your project stays, and everyone's past sessions stay private in their own history."
                : "You lose access to this manuscript and rubric. Your past sessions stay in your history, and your shared score disappears from the group."}
            </Text>
            <View style={styles.action}>
              <Button
                label={busy ? "Saving…" : group.isOwner ? "Stop sharing" : "Leave group"}
                disabled={busy}
                onPress={() =>
                  void run(async () => {
                    await projects.leaveGroup(project);
                    setConfirm(false);
                    if (!group.isOwner) onLeft();
                  })
                }
              />
            </View>
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </Sheet>
        </>
      ) : (
        <>
          <Text style={styles.note}>Share this manuscript and rubric with your teammates. Each member practices privately.</Text>
          <View style={styles.action}>
            <Button
              label={busy ? "Creating code…" : "Create a group code"}
              disabled={busy}
              onPress={() => void run(() => projects.createGroup(project.id))}
            />
          </View>
        </>
      )}
      {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
const styles = StyleSheet.create({
  card: { padding: 16, marginTop: 18, borderRadius: radius.xl, backgroundColor: colors.duskTint },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  flex: { flex: 1 },
  note: { ...type.body, fontSize: 13, lineHeight: 19, color: colors.inkMuted, marginTop: 6 },
  code: {
    fontFamily: fonts.mono,
    fontSize: 28,
    letterSpacing: 5,
    color: colors.duskInk,
    marginVertical: 16,
    textAlign: "center",
  },
  action: { marginTop: 14, minHeight: 44, justifyContent: "center" },
  link: { ...type.button, fontSize: 13, textAlign: "center", color: colors.ink },
  error: { ...type.meta, color: colors.clay, marginTop: 8 },
});
