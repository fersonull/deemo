import { router } from "expo-router";

import { Screen } from "@/components/screen";

// Placeholder for Mic check (screen 10), built in a later task.
export default function MicCheck() {
  return <Screen onBack={() => router.back()} title={"Quick sound\ncheck."} subtitle="Coming next." />;
}
