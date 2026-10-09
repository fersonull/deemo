import { router } from "expo-router";
import { View } from "react-native";

import { Button } from "@/components/button";
import { Screen } from "@/components/screen";

// Placeholder for Mode & setup (screen 9), built in the next task.
export default function Practice() {
  return (
    <Screen title="Practice" subtitle="Mode and setup come next.">
      <View style={{ marginTop: 24 }}>
        <Button variant="secondary" label="Back" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}
