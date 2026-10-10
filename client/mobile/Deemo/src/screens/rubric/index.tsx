import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/button";
import { Screen } from "@/components/screen";
import { DEFAULT_WEIGHTS, RUBRIC } from "@/constants";
import { practiceSetup, usePracticeSetup } from "@/hooks/use-practice-setup";
import { colors, fonts, radius, type } from "@/theme";

import { UploadCard } from "./upload-card";

const STEP = 5;
const MAX = 60;

// "How you'll be scored." (prototype rubric screen, plan F3): the default five criteria, weights set by hand or
// proposed from the panel's own rubric (upload-card.tsx).
export function Rubric() {
  const saved = usePracticeSetup().weights;
  const [weights, setWeights] = useState(saved);
  const total = weights.reduce((a, b) => a + b, 0);
  const isDefault = weights.every((w, i) => w === DEFAULT_WEIGHTS[i]);

  const nudge = (i: number, by: number) =>
    setWeights((ws) => ws.map((w, k) => (k === i ? Math.min(MAX, Math.max(0, w + by)) : w)));

  const use = () => {
    practiceSetup.set({ weights });
    router.back();
  };

  return (
    <Screen scroll onBack={() => router.back()} title={"How you'll\nbe scored."}>
      <Text style={styles.sub}>Five criteria, like most capstone defense forms. Set the weights to match your panel.</Text>
      <UploadCard onWeights={setWeights} />

      <View style={styles.list}>
        {RUBRIC.map((c, i) => (
          <View key={c.name} style={styles.row}>
            <View style={styles.flex}>
              <Text style={styles.name}>{c.name}</Text>
              <Text style={styles.desc}>{c.desc}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Lower ${c.name}`}
              disabled={weights[i] <= 0}
              onPress={() => nudge(i, -STEP)}
              style={[styles.step, weights[i] <= 0 && styles.dim]}
            >
              <Text style={styles.stepText}>−</Text>
            </Pressable>
            <Text style={styles.weight} accessibilityLabel={`${c.name} ${weights[i]} percent`}>
              {weights[i]}%
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Raise ${c.name}`}
              disabled={weights[i] >= MAX}
              onPress={() => nudge(i, STEP)}
              style={[styles.step, weights[i] >= MAX && styles.dim]}
            >
              <Text style={styles.stepText}>+</Text>
            </Pressable>
          </View>
        ))}
      </View>

      <Text style={[styles.total, { color: total === 100 ? colors.sageInk : colors.warnInk }]} accessibilityLiveRegion="polite">
        {total === 100 ? "Total 100%" : `Total ${total}%. Make it 100% to use it.`}
      </Text>

      <View style={styles.cta}>
        <Button label="Use this rubric" onPress={use} disabled={total !== 100} />
      </View>
      {!isDefault ? (
        <Pressable accessibilityRole="button" onPress={() => setWeights(DEFAULT_WEIGHTS)} style={styles.reset}>
          <Text style={styles.resetText}>Back to the default weights</Text>
        </Pressable>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  sub: { ...type.body, fontSize: 13.5, lineHeight: 20, color: colors.inkMuted, marginTop: 8 },
  list: { gap: 8, marginTop: 18 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.sand,
    borderRadius: radius.lg,
    paddingVertical: 12,
    paddingLeft: 16,
    paddingRight: 10,
  },
  name: { fontFamily: fonts.body, fontWeight: "600", fontSize: 14.5, color: colors.ink },
  desc: { ...type.meta, lineHeight: 17, marginTop: 2 },
  step: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.paper, alignItems: "center", justifyContent: "center" },
  stepText: { fontFamily: fonts.body, fontWeight: "600", fontSize: 18, color: colors.ink },
  dim: { opacity: 0.35 },
  weight: { width: 48, textAlign: "center", fontFamily: fonts.mono, fontWeight: "500", fontSize: 15, color: colors.ink },
  total: { fontFamily: fonts.body, fontWeight: "600", fontSize: 13, marginTop: 12, paddingHorizontal: 4 },
  cta: { marginTop: 16 },
  reset: { height: 48, alignItems: "center", justifyContent: "center", marginTop: 4 },
  resetText: { ...type.button, fontSize: 14, color: colors.ink },
});
