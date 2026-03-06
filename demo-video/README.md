# SABI Demo Video

Remotion project for the Nevermined hackathon demo video. Assembles multiple recordings (terminal, webapp, Ray-Ban POV) into a single 2-minute demo.

## Quick start

```bash
cd demo-video
npm install
npm run dev
```

**Remotion API key (optional):** For cloud rendering or team features, add `REMOTION_API_KEY` to Doppler (or `.env`). The CLI works without it for local Studio and render.

Opens Remotion Studio. The composition uses **placeholders** by default (no video files needed). Toggle `usePlaceholders` to `false` in the Props panel once you have real assets.

## Recording and assets

1. **Record** the sources per [docs/demo-video-script.md](../docs/demo-video-script.md)
2. **Place** the video files in `demo-video/public/`:
   - `terminal_seller.mp4`
   - `terminal_buyer.mp4`
   - `webapp_buyer.mp4`
   - `rayban_pov.mp4`
   - Optional: `ben_rayban_broll.mp4` or `ben_rayban_photo.jpg`
3. Set `usePlaceholders: false` in the composition props
4. **Render**: `npm run render` or `npx remotion render SabiDemo out/demo.mp4`

## Scene structure

| Scene        | Time       | Content                                                |
|--------------|------------|--------------------------------------------------------|
| Who we are   | 0:00-0:30  | Spencer & Ben — Senior PMs, agentic tools, A2A         |
| Intro        | 0:30-0:45  | Title: "Sabi: Verifiable real-world information"       |
| Buyer        | 0:45-1:15  | Web app – requester submits question                   |
| Verifier     | 1:15-2:00  | Terminal + Ray-Ban POV (split screen)                  |
| Proof        | 2:00-2:30  | Web app – artifact (photos + answer)                   |
| Connect      | 2:30-2:45  | LinkedIn links + QR codes                               |

## Script and use cases

See [docs/demo-video-script.md](../docs/demo-video-script.md) for:
- Recording sources and asset filenames
- Example use cases (restaurant line, protest, Kalshi/Polymarket)
- Voiceover / caption suggestions
