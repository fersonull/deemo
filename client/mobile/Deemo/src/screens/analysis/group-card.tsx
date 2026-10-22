import { PressableScale } from "@/components/pressable-scale";
import { useState } from "react";
import { Share, StyleSheet, Switch, Text, View } from "react-native";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/button";
import { Sheet } from "@/components/sheet";
import { Icon } from "@/components/icon";
import { projects, useProjects, type Project } from "@/hooks/use-projects";
import { colors, fonts, lit, radius, type } from "@/theme";

const FACE = 32;
const SHOWN = 4; // faces before "+n": the stack shares a row with the code chip and the share button

// Your research group, compact (the analysis screen): the join code with a share button, the members as a stack of
// faces (from the same /groups data as Home's Group readiness), the share-my-score switch and a small leave link.
// On sand, like Group readiness, so the dusk faces carry the color.
export function GroupCard({ project, onLeft }: { project: Project; onLeft: () => void }) {
  const { groups, savingMembers } = useProjects();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);
  const group = project.group;
  const members = groups.find((g) => g.code === group?.code)?.members ?? [];
  const extra = members.length - SHOWN;
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
        <Text style={type.heading}>Your research group</Text>
      </View>
      {group ? (
        <>
          <View style={styles.codeRow}>
            <View style={styles.codeChip}>
              <Text selectable accessibilityLabel={`Join code ${group.code.split("").join(" ")}`} style={styles.code}>
                {group.code}
              </Text>
            </View>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel="Share the join code"
              onPress={() =>
                void Share.share({ message: `Join our research group on DEEMO with the code ${group.code}.` }).catch(() => {})
              }
              hitSlop={4}
              style={styles.iconButton}
            >
              <Icon name="share" size={18} color={colors.duskInk} />
            </PressableScale>
            {members.length ? (
              <View
                style={styles.stack}
                accessible
                accessibilityLabel={`${members.length} ${members.length === 1 ? "member" : "members"}: ${members
                  .map((m) => (m.isYou ? "you" : m.name))
                  .join(", ")}`}
              >
                {members.slice(0, SHOWN).map((m, i) => (
                  <View key={i} style={[styles.face, i > 0 && styles.overlap, { zIndex: SHOWN - i }]}>
                    <Avatar seed={m.avatar} name={m.name} size={FACE} premium={m.premium} />
                  </View>
                ))}
                {extra > 0 ? (
                  <View style={[styles.face, styles.overlap, styles.more]}>
                    <Text style={styles.moreText}>+{extra}</Text>
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
          <Text style={styles.note}>
            {group.isOwner
              ? "Anyone with this code can join and read the manuscript."
              : "Your leader keeps the shared manuscript and rubric up to date."}
          </Text>
          <View style={[styles.row, styles.share]}>
            <View style={styles.flex}>
              <Text style={type.bodyStrong}>Share my latest score</Text>
              <Text style={styles.note}>Transcripts and reports stay private.</Text>
            </View>
            <Switch
              accessibilityLabel="Share my latest score with group"
              value={group.shareScore}
              disabled={busy || savingMembers.includes(project.id)}
              onValueChange={(shareScore) => void run(() => projects.updateMember(project, { shareScore }))}
              trackColor={{ false: colors.border, true: colors.dusk }}
              thumbColor={colors.onFill}
            />
          </View>
          <PressableScale
            accessibilityRole="button"
            disabled={busy}
            hitSlop={8}
            onPress={() => setConfirm(true)}
            style={styles.leave}
          >
            <Text style={styles.link}>{group.isOwner ? "Stop sharing this project" : "Leave group"}</Text>
          </PressableScale>
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
                busy={busy}
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
              busy={busy}
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
  card: { ...lit, padding: 16, marginTop: 16, borderRadius: radius.xl, backgroundColor: colors.sand },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  flex: { flex: 1 },
  note: { ...type.body, fontSize: 13, lineHeight: 19, color: colors.inkMuted, marginTop: 8 },
  codeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 },
  codeChip: { height: 40, paddingHorizontal: 14, borderRadius: radius.md, backgroundColor: colors.paper, justifyContent: "center" },
  code: { fontFamily: fonts.mono, fontWeight: "500", fontSize: 20, letterSpacing: 3, color: colors.duskInk },
  iconButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.paper, alignItems: "center", justifyContent: "center" },
  stack: { flex: 1, flexDirection: "row", justifyContent: "flex-end" },
  face: { borderRadius: FACE / 2 + 2, borderWidth: 2, borderColor: colors.sand },
  overlap: { marginLeft: -10 },
  more: { width: FACE + 4, height: FACE + 4, backgroundColor: colors.paper, alignItems: "center", justifyContent: "center" },
  moreText: { fontFamily: fonts.body, fontWeight: "600", fontSize: 12, color: colors.inkMuted },
  share: { marginTop: 12 },
  action: { marginTop: 16, minHeight: 44, justifyContent: "center" },
  leave: { alignSelf: "center", minHeight: 40, justifyContent: "center", marginTop: 4 },
  link: { ...type.button, fontSize: 13, textAlign: "center", color: colors.inkMuted },
  error: { ...type.meta, color: colors.warnInk, marginTop: 8 },
});
