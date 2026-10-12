import { Tabs } from "expo-router";

import { TabBar } from "@/components/tab-bar";

export default function TabsLayout() {
  return (
    // Switching tabs cross-fades (short and quiet: tabs are tapped often).
    <Tabs screenOptions={{ headerShown: false, animation: "fade" }} tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="projects" options={{ title: "Projects" }} />
      <Tabs.Screen name="history" options={{ title: "History" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
