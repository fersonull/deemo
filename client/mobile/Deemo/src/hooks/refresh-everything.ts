import { projects } from "@/hooks/use-projects";
import { session } from "@/hooks/use-session";
import { sessions } from "@/hooks/use-sessions";

// Pull to refresh, anywhere: reload everything the server keeps for the student (the account record, sessions,
// projects and group cards) in one go. Each read goes to Firestore through the server, nothing is cached in between,
// so edits made outside the app (the Firestore console, another device) show up.
export const refreshEverything = () => Promise.all([session.refresh(), sessions.refresh(), projects.refresh()]);
