/**
 * SABI Demo Video Composition
 *
 * Scene structure (from docs/demo-video-script.md):
 * 1. Who we are (0:00–0:30) - 30s for team intro
 * 2. Intro (0:30–0:45) - Title
 * 3. Buyer side (0:45–1:15) - Web app hero
 * 4. Seller/verifier side (1:15–2:00) - Terminal + Ray-Ban POV
 * 5. Proof and close (2:00–2:30) - Web app, artifact view
 * 6. Connect with us (2:30–2:45) - LinkedIn links + QR codes
 *
 * Place video assets in public/:
 * - terminal_seller.mp4, terminal_buyer.mp4
 * - webapp_buyer.mp4
 * - rayban_pov.mp4
 * - ben_rayban_broll.mp4 or ben_rayban_photo.jpg (optional)
 *
 * Pass usePlaceholders: true in defaultProps to show colored placeholders
 * instead of videos (useful before recording assets).
 */
import React from "react";
import {
  AbsoluteFill,
  Sequence,
  staticFile,
  OffthreadVideo,
} from "remotion";
import { QRCodeSVG } from "qrcode.react";

const FPS = 30;

const LINKEDIN_SPENCER = "https://www.linkedin.com/in/spencerkerber/";
const LINKEDIN_BEN = "https://www.linkedin.com/in/bimadali/";

export type SabiDemoProps = {
  usePlaceholders?: boolean;
};

// Scene boundaries (in frames)
const WHO_WE_ARE_START = 0;
const WHO_WE_ARE_DURATION = 30 * FPS; // 0:00-0:30

const INTRO_START = 30 * FPS;
const INTRO_DURATION = 15 * FPS; // 0:30-0:45

const BUYER_START = 45 * FPS;
const BUYER_DURATION = 30 * FPS; // 0:45-1:15

const VERIFIER_START = 75 * FPS;
const VERIFIER_DURATION = 45 * FPS; // 1:15-2:00

const PROOF_START = 120 * FPS;
const PROOF_DURATION = 30 * FPS; // 2:00-2:30

const CONNECT_START = 150 * FPS;
const CONNECT_DURATION = 15 * FPS; // 2:30-2:45

function VideoOrPlaceholder({
  src,
  label,
  style,
  usePlaceholders,
}: {
  src: string;
  label?: string;
  style?: React.CSSProperties;
  usePlaceholders?: boolean;
}) {
  if (usePlaceholders) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          backgroundColor: "#1a1a2e",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          border: "2px dashed #444",
          ...style,
        }}
      >
        <span style={{ color: "#888", fontSize: 14 }}>{label || src}</span>
      </div>
    );
  }
  return (
    <OffthreadVideo
      src={staticFile(src)}
      style={{ objectFit: "contain", ...style }}
    />
  );
}

function WhoWeAreScene() {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0a0a0a",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          color: "white",
          fontSize: 42,
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          maxWidth: 900,
        }}
      >
        Spencer Kerber & Ben Imadali
      </div>
      <div
        style={{
          color: "#aaa",
          fontSize: 28,
          marginTop: 20,
          textAlign: "center",
        }}
      >
        Senior PMs — we work with agentic tools in our day jobs
      </div>
      <div
        style={{
          color: "#666",
          fontSize: 20,
          marginTop: 16,
          textAlign: "center",
          maxWidth: 700,
        }}
      >
        That's what got us excited about A2A and building something that connects
        real-world verification to agent payments
      </div>
    </AbsoluteFill>
  );
}

function IntroScene() {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0a0a0a",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          color: "white",
          fontSize: 48,
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          maxWidth: 800,
        }}
      >
        Sabi: Verifiable Real-World Information
      </div>
      <div
        style={{
          color: "#888",
          fontSize: 24,
          marginTop: 24,
          textAlign: "center",
        }}
      >
        Photo-backed answers for questions about the physical world
      </div>
    </AbsoluteFill>
  );
}

function ConnectScene() {
  const qrSize = 180;
  const qrBg = "#ffffff";
  const qrFg = "#0a0a0a";

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0a0a0a",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          color: "white",
          fontSize: 32,
          fontFamily: "system-ui, sans-serif",
          marginBottom: 32,
        }}
      >
        Connect with us
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          gap: 80,
          alignItems: "flex-start",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              padding: 16,
              backgroundColor: qrBg,
              borderRadius: 8,
              display: "inline-block",
            }}
          >
            <QRCodeSVG
              value={LINKEDIN_SPENCER}
              size={qrSize}
              bgColor={qrBg}
              fgColor={qrFg}
              level="M"
            />
          </div>
          <div
            style={{
              color: "#aaa",
              fontSize: 18,
              marginTop: 12,
              fontFamily: "system-ui, sans-serif",
            }}
          >
            Spencer Kerber
          </div>
          <div
            style={{
              color: "#666",
              fontSize: 14,
              marginTop: 4,
              fontFamily: "monospace",
            }}
          >
            linkedin.com/in/spencerkerber
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              padding: 16,
              backgroundColor: qrBg,
              borderRadius: 8,
              display: "inline-block",
            }}
          >
            <QRCodeSVG
              value={LINKEDIN_BEN}
              size={qrSize}
              bgColor={qrBg}
              fgColor={qrFg}
              level="M"
            />
          </div>
          <div
            style={{
              color: "#aaa",
              fontSize: 18,
              marginTop: 12,
              fontFamily: "system-ui, sans-serif",
            }}
          >
            Ben Imadali
          </div>
          <div
            style={{
              color: "#666",
              fontSize: 14,
              marginTop: 4,
              fontFamily: "monospace",
            }}
          >
            linkedin.com/in/bimadali
          </div>
        </div>
      </div>
      <div
        style={{
          color: "#555",
          fontSize: 18,
          marginTop: 40,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        Thanks for watching
      </div>
    </AbsoluteFill>
  );
}

function BuyerScene({ usePlaceholders }: { usePlaceholders?: boolean }) {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0a" }}>
      <VideoOrPlaceholder
        src="webapp_buyer.mp4"
        label="webapp_buyer.mp4"
        style={{ width: "100%", height: "100%" }}
        usePlaceholders={usePlaceholders}
      />
    </AbsoluteFill>
  );
}

function VerifierScene({ usePlaceholders }: { usePlaceholders?: boolean }) {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0a" }}>
      {/* Split: terminal left, Ray-Ban/iPhone right */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          width: "100%",
          height: "100%",
          gap: 8,
        }}
      >
        <div style={{ flex: 1 }}>
          <VideoOrPlaceholder
            src="terminal_seller.mp4"
            label="terminal_seller.mp4"
            style={{ width: "100%", height: "100%" }}
            usePlaceholders={usePlaceholders}
          />
        </div>
        <div style={{ flex: 1 }}>
          <VideoOrPlaceholder
            src="rayban_pov.mp4"
            label="rayban_pov.mp4"
            style={{ width: "100%", height: "100%" }}
            usePlaceholders={usePlaceholders}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
}

function ProofScene({ usePlaceholders }: { usePlaceholders?: boolean }) {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0a" }}>
      <VideoOrPlaceholder
        src="webapp_buyer.mp4"
        label="webapp_buyer.mp4 (artifact view)"
        style={{ width: "100%", height: "100%" }}
        usePlaceholders={usePlaceholders}
      />
    </AbsoluteFill>
  );
}

export const SabiDemo: React.FC<SabiDemoProps> = ({
  usePlaceholders = true,
}) => {
  return (
    <>
      <Sequence
        from={WHO_WE_ARE_START}
        durationInFrames={WHO_WE_ARE_DURATION}
        name="Who we are"
      >
        <WhoWeAreScene />
      </Sequence>
      <Sequence from={INTRO_START} durationInFrames={INTRO_DURATION} name="Intro">
        <IntroScene />
      </Sequence>
      <Sequence from={BUYER_START} durationInFrames={BUYER_DURATION} name="Buyer">
        <BuyerScene usePlaceholders={usePlaceholders} />
      </Sequence>
      <Sequence
        from={VERIFIER_START}
        durationInFrames={VERIFIER_DURATION}
        name="Verifier"
      >
        <VerifierScene usePlaceholders={usePlaceholders} />
      </Sequence>
      <Sequence from={PROOF_START} durationInFrames={PROOF_DURATION} name="Proof">
        <ProofScene usePlaceholders={usePlaceholders} />
      </Sequence>
      <Sequence
        from={CONNECT_START}
        durationInFrames={CONNECT_DURATION}
        name="Connect"
      >
        <ConnectScene />
      </Sequence>
    </>
  );
};
