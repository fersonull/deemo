import { PressableScale } from "@/components/pressable-scale";
import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { Avatar } from "@/components/avatar";
import { Icon } from "@/components/icon";
import { Score } from "@/components/score";
import { MODE_LABELS, type Mode } from "@/constants";
import { useProjects, type GroupReadiness as Group } from "@/hooks/use-projects";
import { colors, fonts, radius, type } from "@/theme";
import { bandOf } from "@/utils/bands";

type Member = Group["members"][number];

const firstName = (m: Member) => (m.isYou ? "You" : m.name.trim().split(/\s+/)[0] || "Member");

// What a screen reader hears for one member: who, then their latest score, or why there isn't one.
function describe(m: Member) {
  const who = `${m.name}${m.isYou ? " (you)" : ""}${m.premium ? ", Premium" : ""}`;
  if (m.score === undefined) return `${who}, ${m.sharing ? "no score yet" : "keeps scores private"}`;
  const when = new Date(m.createdAt!).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${who}, ${m.score} percent readiness, ${bandOf(m.score).name}, ${MODE_LABELS[m.mode as Mode] ?? m.mode}, ${when}`;
}

// Group readiness on Home, compact: one face per member with their latest scored practice under it. More members
// than fit scroll sideways. The card sits on warm sand like the rest of Home; the dusk tints belong to the faces, so
// they carry the color, and a "Nearly ready" (dusk) score still reads as a band. Secondary text is inkMuted, since
// muted falls under 4.5:1 on sand.
export function GroupReadiness() {
  const { groups } = useProjects();
  return (
    <>
      {groups.map((g) => (
        <View key={g.code} style={styles.card}>
          <View style={styles.head}>
            <Icon name="group" size={20} color={colors.duskIcon} />
            <Text style={[type.heading, styles.flex]}>Group readiness</Text>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel="Group and sharing settings"
              hitSlop={8}
              onPress={() => router.push({ pathname: "/analysis", params: { id: g.projectId } })}
              style={styles.settings}
            >
              <Text style={styles.link}>Settings</Text>
              <Icon name="chevron_right" size={16} color={colors.duskLink} />
            </PressableScale>
          </View>
          <Text style={styles.title} numberOfLines={1}>
            {g.title}
          </Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.members}>
            {g.members.map((m, i) => (
              <View key={i} style={styles.member} accessible accessibilityLabel={describe(m)}>
                <View style={styles.ring}>
                  <Avatar seed={m.avatar} name={m.name} size={44} premium={m.premium} />
                </View>
                <Text style={[styles.name, m.isYou && styles.you]} numberOfLines={1}>
                  {firstName(m)}
                </Text>
                {m.score !== undefined ? (
                  <Score value={m.score} style={styles.score} banded />
                ) : m.sharing ? (
                  <Text style={styles.none}>–</Text>
                ) : (
                  <Icon name="lock" size={14} color={colors.inkMuted} />
                )}
              </View>
            ))}
          </ScrollView>

          <Text style={styles.note}>Latest scored practice each; settings may differ.</Text>
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.sand, borderRadius: radius.xl, paddingVertical: 14, paddingHorizontal: 16, marginTop: 20 },
  head: { flexDirection: "row", alignItems: "center", gap: 8 },
  flex: { flex: 1 },
  settings: { flexDirection: "row", alignItems: "center", minHeight: 32 },
  link: { ...type.bodyStrong, fontSize: 13, color: colors.duskLink },
  title: { ...type.meta, color: colors.inkMuted, marginTop: 2 },
  members: { gap: 6, paddingTop: 12, paddingBottom: 2 },
  member: { width: 62, alignItems: "center" },
  ring: { borderRadius: 26, borderWidth: 2, borderColor: colors.paper },
  name: { fontFamily: fonts.body, fontWeight: "500", fontSize: 12, color: colors.inkMuted, marginTop: 5, maxWidth: 62 },
  you: { fontWeight: "600", color: colors.ink },
  score: { fontFamily: fonts.body, fontWeight: "700", fontSize: 15, lineHeight: 19 },
  none: { fontFamily: fonts.body, fontWeight: "600", fontSize: 15, lineHeight: 19, color: colors.inkMuted },
  note: { ...type.meta, fontSize: 11.5, color: colors.inkMuted, marginTop: 8 },
});
