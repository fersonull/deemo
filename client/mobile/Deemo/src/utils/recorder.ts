import { AudioRecorder } from "react-native-audio-api";

let recorder: AudioRecorder | null = null;

// The library recommends a single recorder instance; the mic check and the live session share it.
export const getRecorder = () => (recorder ??= new AudioRecorder());
