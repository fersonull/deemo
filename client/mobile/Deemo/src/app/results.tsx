import { useLocalSearchParams } from "expo-router";

import { Results } from "@/screens/results";

export default function ResultsRoute() {
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  return <Results id={id} fromSession={from === "session"} />;
}
