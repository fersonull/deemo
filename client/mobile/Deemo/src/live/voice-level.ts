import { makeMutable } from "react-native-reanimated";

// How open the speaking panelist's mouth is (0..1), written by the live engine from the voice actually playing and
// read on the UI thread by the panel face, so lip-sync never re-renders React.
export const panelVoice = makeMutable(0);
