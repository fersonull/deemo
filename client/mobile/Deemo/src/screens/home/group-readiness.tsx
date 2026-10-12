import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Icon } from "@/components/icon";
import { Score } from "@/components/score";
import { MODE_LABELS, type Mode } from "@/constants";
import { useProjects } from "@/hooks/use-projects";
import { colors, radius, type } from "@/theme";

export function GroupReadiness() {
  const { groups } = useProjects();
  return (
    <>
      {groups.map((g) => (
        <View key={g.code} style={styles.card}>
          <View style={styles.row}>
            <Icon name="group" color={colors.duskIcon} />
            <Text style={type.heading}>Group readiness</Text>
          </View>
          <Text style={styles.note} numberOfLines={2}>
            {g.title}
          </Text>
          {g.members.map((m, i) => (
            <View key={i} style={styles.member}>
              <View style={styles.flex}>
                <Text style={type.bodyStrong}>
                  {m.name}
                  {m.isYou ? " (you)" : ""}
                </Text>
                {m.score !== undefined ? (
                  <Text style={type.meta}>
                    {MODE_LABELS[m.mode as Mode] ?? m.mode} ·{" "}
                    {new Date(m.createdAt!).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </Text>
                ) : null}
              </View>
              {m.score !== undefined ? (
                <Score value={m.score} style={styles.score} caption banded align="right" />
              ) : (
                <Text style={styles.note}>{m.sharing ? "No score yet" : "Private"}</Text>
              )}
            </View>
          ))}
          <Text style={styles.note}>
            Each score is from that member’s latest scored practice. Sessions may use different settings.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({ pathname: "/analysis", params: { id: g.projectId } })}
            style={styles.action}
          >
            <Text style={styles.link}>Group & sharing settings</Text>
            <Icon name="chevron_right" size={18} color={colors.duskLink} />
          </Pressable>
        </View>
      ))}
    </>
  );
}
const styles = StyleSheet.create({
  card: { backgroundColor: colors.duskTint, borderRadius: radius.xl, padding: 16, marginTop: 20 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  member: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 14 },
  flex: { flex: 1 },
  note: { ...type.meta, lineHeight: 18, marginTop: 4 },
  score: { ...type.heading, color: colors.duskInk, fontSize: 24 },
  action: { minHeight: 44, marginTop: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  link: { ...type.bodyStrong, fontSize: 13, color: colors.duskLink },
});
