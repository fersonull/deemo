import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Avatar } from "@/components/avatar";
import { Button } from "@/components/button";
import { Icon } from "@/components/icon";
import { PressableScale } from "@/components/pressable-scale";
import { Sheet } from "@/components/sheet";
import { session } from "@/hooks/use-session";
import { colors, type } from "@/theme";
import { randomSeeds } from "@/utils/avatar";

const TILE = 64 + 2 * (3 + 2.5); // avatar + padding + ring
const GAP = 10;

type Props = { visible: boolean; onClose: () => void; current: string | null; name: string | null; email: string | null };

// Pick your look: the current face first, then fresh ones; tap one to preview it big, "More faces" deals a new set.
// ponytail: 8 new faces per deal keeps a deal under DiceBear's 10 PNGs/second limit.
export function AvatarSheet({ visible, onClose, current, name, email }: Props) {
  const [options, setOptions] = useState<string[]>([]);
  const [picked, setPicked] = useState(current);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [wasVisible, setWasVisible] = useState(false);

  const deal = (keep: string | null) => setOptions([...(keep ? [keep] : []), ...randomSeeds(keep ? 8 : 9)]);

  // Each opening starts from the current face and a fresh deal (reset while rendering, React's pattern for this).
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setPicked(current);
      setError("");
      deal(current);
    }
  }

  const save = async () => {
    if (!picked) return;
    setSaving(true);
    setError("");
    try {
      await session.setAvatar(picked);
      onClose();
    } catch {
      setError("Couldn't save your look. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={() => !saving && onClose()}>
      <Text style={styles.title}>Pick your look</Text>
      <Text style={styles.body}>Your group sees it next to your score.</Text>

      <View style={styles.preview}>
        <Avatar seed={picked} name={name} email={email} size={112} />
      </View>

      <View accessibilityRole="radiogroup" accessibilityLabel="Faces" style={styles.grid}>
        {options.map((seed, i) => {
          const selected = seed === picked;
          return (
            <PressableScale
              key={seed}
              scaleTo={0.95}
              accessibilityRole="radio"
              accessibilityLabel={i === 0 && seed === current ? "Your current face" : `Face ${i + 1}`}
              accessibilityState={{ checked: selected }}
              onPress={() => setPicked(seed)}
              style={[styles.tile, selected && styles.tileSelected]}
            >
              <Avatar seed={seed} name={name} email={email} size={64} />
            </PressableScale>
          );
        })}
      </View>

      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}

      <View style={styles.actions}>
        <Button
          variant="secondary"
          label="More faces"
          leading={<Icon name="shuffle" size={18} color={colors.ink} />}
          onPress={() => deal(picked)}
          disabled={saving}
        />
        <Button
          label={saving ? "Saving…" : "Save"}
          onPress={save}
          busy={saving}
          disabled={saving || !picked || picked === current}
        />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  title: { ...type.title, fontSize: 26, lineHeight: 28, letterSpacing: -0.8 },
  body: { ...type.body, color: colors.inkMuted, marginTop: 6 },
  preview: { alignItems: "center", marginTop: 16 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: GAP, width: 3 * TILE + 2 * GAP, alignSelf: "center", marginTop: 16 },
  tile: { padding: 3, borderRadius: 38, borderWidth: 2.5, borderColor: "transparent" },
  tileSelected: { borderColor: colors.dusk },
  error: { ...type.body, fontSize: 13, color: colors.warnInk, marginTop: 10, textAlign: "center" },
  actions: { gap: 8, marginTop: 16 },
});
