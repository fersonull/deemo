import { useEffect, useState } from "react";
import { AudioManager } from "react-native-audio-api";

type Earphones = "wired" | "bluetooth" | null;

// ponytail: polls every 2 s; switch to a route-change listener if it costs battery on low-end phones.
export function useEarphones() {
  const [earphones, setEarphones] = useState<Earphones>(null);

  useEffect(() => {
    let active = true;
    const check = async () => {
      const { availableOutputs } = await AudioManager.getDevicesInfo();
      const cats = availableOutputs.map((d) => d.category);
      const found: Earphones = cats.some((c) => c.startsWith("Wired"))
        ? "wired"
        : cats.some((c) => c.startsWith("Bluetooth"))
          ? "bluetooth"
          : null;
      if (active) setEarphones(found);
    };
    check();
    const id = setInterval(check, 2000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  return earphones;
}
