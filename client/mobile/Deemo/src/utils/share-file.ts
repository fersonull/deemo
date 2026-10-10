import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

// Hands a file to Android's share sheet (Gmail, Drive, Messenger, Files…) under the name the student will see.
// `text` is written as-is; `uri` (e.g. a printed PDF) is moved into place.
export async function shareFile(name: string, mimeType: string, from: { text: string } | { uri: string }) {
  const file = new File(Paths.cache, name);
  if ("text" in from) {
    file.create({ overwrite: true });
    file.write(from.text);
  } else await new File(from.uri).move(file, { overwrite: true });
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: name });
}
