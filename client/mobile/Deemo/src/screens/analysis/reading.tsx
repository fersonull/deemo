import { Working, type Step } from "@/components/working";

const STEPS: Step[] = [
  ["Reading your chapters", 15],
  ["Finding your objectives", 40],
  ["Mapping the methodology", 65],
  ["Checking scope and limits", 90],
];

// "Your panel is reading." (prototype analysis screen, analyzing state). A manuscript takes ~30–60 s.
export function Reading({ since }: { since: string }) {
  return (
    <Working
      title={"Your panel is\nreading."}
      subtitle="This usually takes 30 to 60 seconds."
      since={Date.parse(since)}
      expectedMs={50_000}
      steps={STEPS}
    />
  );
}
