import { useCallback, useState } from "react";
import { RefreshControl } from "react-native";

import { colors } from "@/theme";

// Pull down to reload a list: Android's spinner in the panel's indigo while `load` runs.
export function usePullRefresh(load: () => Promise<unknown>) {
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);
  return <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.dusk]} progressBackgroundColor={colors.paper} />;
}
