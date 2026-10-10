import { useLocalSearchParams } from "expo-router";

import { Scoring } from "@/screens/scoring";

export default function ScoringRoute() {
  const { ms = "0", answered = "0" } = useLocalSearchParams<{ ms?: string; answered?: string }>();
  return <Scoring ms={Number(ms)} answered={Number(answered)} />;
}
