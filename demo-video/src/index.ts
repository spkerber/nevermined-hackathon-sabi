/**
 * SABI Demo Video - Remotion entry point
 * Render: npx remotion render SabiDemo out/demo.mp4
 */
import { registerRoot } from "remotion";
import { RemotionRoot } from "./Root";

registerRoot(RemotionRoot);
