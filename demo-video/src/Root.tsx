import React from "react";
import { Composition } from "remotion";
import { SabiDemo } from "./SabiDemo";

const FPS = 30;
const WIDTH = 1920;
const HEIGHT = 1080;

// Total duration: 2 min 45s = 165s = 4950 frames
const DURATION_FRAMES = 165 * FPS;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="SabiDemo"
        component={SabiDemo}
        durationInFrames={DURATION_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{ usePlaceholders: true }}
      />
    </>
  );
};
