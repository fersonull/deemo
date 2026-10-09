import { router } from "expo-router";

import { Screen } from "@/components/screen";

// Placeholder for the Live session (screen 11), built in a later task.
export default function Session() {
  return <Screen onBack={() => router.back()} title="Live session" subtitle="Coming next." />;
}
