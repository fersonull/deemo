import { getAuth } from "@react-native-firebase/auth";
import { File, Paths } from "expo-file-system";

// The session being practiced, kept on the phone until the server has it. Written after every answer and when the
// app leaves the foreground, and again just before submitting; deleted once the server confirms. If the app is
// killed or the phone dies mid-session, Home finds it on the next launch and offers a report for what was answered.
// Only the account that recorded it is ever offered it.
export type SessionBackup = { uid: string; savedAt: string; ms: number; answered: number; payload: object };

const file = () => new File(Paths.document, "interrupted-session.json");

export const sessionBackup = {
  save(payload: { durationMs: number; turns: unknown[] }) {
    const uid = getAuth().currentUser?.uid;
    if (!uid || payload.turns.length === 0) return; // nothing answered yet: nothing worth a report
    const backup: SessionBackup = { uid, savedAt: new Date().toISOString(), ms: payload.durationMs, answered: payload.turns.length, payload };
    try {
      file().write(JSON.stringify(backup));
    } catch {
      // Storage unavailable: the session just can't be recovered after a crash.
    }
  },

  // The signed-in student's interrupted session, if there is one.
  load(): SessionBackup | null {
    try {
      const f = file();
      if (!f.exists) return null;
      const backup = JSON.parse(f.textSync()) as SessionBackup;
      return backup.uid === getAuth().currentUser?.uid ? backup : null;
    } catch {
      return null;
    }
  },

  clear() {
    try {
      const f = file();
      if (f.exists) f.delete();
    } catch {
      // Already gone or unreadable: nothing to offer either way.
    }
  },
};
