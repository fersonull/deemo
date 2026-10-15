import { projects } from "@/hooks/use-projects";
import { session } from "@/hooks/use-session";
import { sessions } from "@/hooks/use-sessions";

// Pull to refresh, anywhere: reload everything the server keeps for the student (the account record, sessions,
// projects and group cards) in one go, even if it was loaded a moment ago, so edits made outside the app (another
// device, a teammate) show up.
export const refreshEverything = () => Promise.all([session.refresh(), sessions.refresh(true), projects.refresh(true)]);
