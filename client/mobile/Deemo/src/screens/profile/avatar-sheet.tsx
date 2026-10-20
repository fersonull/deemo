import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Avatar } from "@/components/avatar";
import { Button } from "@/components/button";
import { Icon } from "@/components/icon";
import { PressableScale } from "@/components/pressable-scale";
import { Sheet } from "@/components/sheet";
import { session } from "@/hooks/use-session";
import { colors, fonts, type } from "@/theme";
import { pageOfFaces } from "@/utils/avatar";

const TILE = 64 + 2 * (3 + 2.5); // avatar + padding + ring
const GAP = 10;

type Props = {
  visible: boolean;
  onClose: () => void;
  current: string | null;
  premium: boolean;
  name: string | null;
  email: string | null;
};

const PAGES = 500; // plenty of faces; a bound keeps random pages reusable from the cache

// Pick your look: the current face first, then a page of faces; tap one to preview it big. ‹ › turn the page (keeping
// the picked face), Randomize jumps to a random page and picks a face on it. Pages are fixed (utils/avatar.ts), so
// reopening, or going back to a page, costs no downloads.
export function AvatarSheet({ visible, onClose, current, premium, name, email }: Props) {
  const [options, setOptions] = useState<string[]>([]);
  const [picked, setPicked] = useState(current);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [wasVisible, setWasVisible] = useState(false);
  const [page, setPage] = useState(0);

  const turnTo = (n: number, keep: string | null) => {
    setPage(n);
    setOptions(pageOfFaces(n, keep));
  };

  // Each opening starts from the current face and a fresh deal (reset while rendering, React's pattern for this).
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setPicked(current);
      setError("");
      turnTo(0, current);
    }
  }

  const randomize = () => {
    const n = (page + 1 + Math.floor(Math.random() * (PAGES - 1))) % PAGES; // never the page on screen
    const faces = pageOfFaces(n, null);
    const face = faces[Math.floor(Math.random() * faces.length)];
    setPicked(face);
    turnTo(n, face);
  };

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
        <Avatar seed={picked} name={name} email={email} size={112} premium={premium} />
      </View>

      <View accessibilityRole="radiogroup" accessibilityLabel="Faces" style={styles.grid}>
        {options.map((seed, i) => {
          const selected = seed === picked;
          return (
            <PressableScale
              key={seed}
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

      <View style={styles.pager}>
        <PageButton
          icon="chevron_left"
          label="Previous faces"
          disabled={saving || page === 0}
          onPress={() => turnTo(page - 1, picked)}
        />
        <Text style={styles.pageLabel} accessibilityLiveRegion="polite">
          Page {page + 1}
        </Text>
        <PageButton
          icon="chevron_right"
          label="Next faces"
          disabled={saving || page === PAGES - 1}
          onPress={() => turnTo(page + 1, picked)}
        />
        <PressableScale
          accessibilityRole="button"
          accessibilityHint="Picks a random face"
          disabled={saving}
          onPress={randomize}
          style={styles.randomize}
        >
          <Icon name="shuffle" size={18} color={colors.ink} />
          <Text style={styles.randomizeText}>Randomize</Text>
        </PressableScale>
      </View>

      <View style={styles.actions}>
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

type PageButtonProps = { icon: string; label: string; disabled: boolean; onPress: () => void };

function PageButton({ icon, label, disabled, onPress }: PageButtonProps) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={6}
      onPress={onPress}
      style={[styles.pageButton, disabled && styles.dim]}
    >
      <Icon name={icon} size={22} color={colors.ink} />
    </PressableScale>
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
  pager: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 16 },
  pageButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.sand, alignItems: "center", justifyContent: "center" },
  dim: { opacity: 0.4 },
  pageLabel: { ...type.meta, minWidth: 56, textAlign: "center", fontVariant: ["tabular-nums"] },
  randomize: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.sand,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  randomizeText: { fontFamily: fonts.body, fontWeight: "600", fontSize: 14, color: colors.ink },
  actions: { marginTop: 12 },
});
