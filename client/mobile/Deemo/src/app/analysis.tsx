import { useLocalSearchParams } from "expo-router";

import { Analysis } from "@/screens/analysis";

export default function AnalysisRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Analysis id={id} />;
}
