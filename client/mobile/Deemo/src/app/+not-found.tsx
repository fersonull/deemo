import { Redirect } from "expo-router";

// A broken or outdated deemo:// link: go to the start (the root layout's guards pick the right screen).
export default function NotFound() {
  return <Redirect href="/" />;
}
