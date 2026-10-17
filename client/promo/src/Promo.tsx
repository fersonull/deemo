import { Audio } from "@remotion/media";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Ask } from "./scenes/ask";
import { Cta } from "./scenes/cta";
import { Flag } from "./scenes/flag";
import { Hook } from "./scenes/hook";
import { Meet } from "./scenes/meet";
import { Panel } from "./scenes/panel";
import { Report } from "./scenes/report";
import { Upload } from "./scenes/upload";
import { hasMusic, sceneFrames, TRANSITION } from "./script";

// Each scene is as long as its voiceover (src/audio.json, from `bun run audio`) and overlaps the next by TRANSITION.
export const Promo = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const t = linearTiming({ durationInFrames: TRANSITION });

  return (
    <>
      {hasMusic ? (
        <Audio
          name="Music"
          src={staticFile("audio/music.mp3")}
          loop
          volume={interpolate(frame, [0, 20, durationInFrames - 45, durationInFrames - 1], [0, 0.16, 0.16, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })}
        />
      ) : null}
      <TransitionSeries>
        <TransitionSeries.Sequence name="Hook" durationInFrames={sceneFrames("hook")}>
          <Hook />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={wipe({ direction: "from-left" })} timing={t} />
        <TransitionSeries.Sequence name="Meet" durationInFrames={sceneFrames("meet")}>
          <Meet />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: "from-bottom" })} timing={t} />
        <TransitionSeries.Sequence name="Upload" durationInFrames={sceneFrames("upload")}>
          <Upload />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={t} />
        <TransitionSeries.Sequence name="Panel" durationInFrames={sceneFrames("panel")}>
          <Panel />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={wipe({ direction: "from-bottom" })} timing={t} />
        <TransitionSeries.Sequence name="Ask" durationInFrames={sceneFrames("ask")}>
          <Ask />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={wipe({ direction: "from-top" })} timing={t} />
        <TransitionSeries.Sequence name="Flag" durationInFrames={sceneFrames("flag")}>
          <Flag />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={t} />
        <TransitionSeries.Sequence name="Report" durationInFrames={sceneFrames("report")}>
          <Report />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={t} />
        <TransitionSeries.Sequence name="CTA" durationInFrames={sceneFrames("cta")}>
          <Cta />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </>
  );
};
