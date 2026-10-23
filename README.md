# Carousel Motion Lab

Help fix the carousel’s settling motion on iOS.

The Material Design 3 carousel in [Token Catalog](https://tokencatalog.dev/md3/components/carousel) changes each card’s visible width while keeping its artwork at a fixed size. Dragging usually feels smooth. After release, some versions pause or step as they slow down. Others overshoot excessively before correcting their position.

The current baseline is smooth on PC. The remaining touch issues reproduce on iPhone and iPad.

**[Try the playground](https://sojupie.github.io/carousel-motion-lab/)** · [Findings](FINDINGS.md) · [Submit a fix](https://github.com/sojupie/carousel-motion-lab/compare)

![A card edge holds across two frames, then moves forward.](site/assets/settling-edge.webp)

All nine versions are available for comparison, with annotated videos and recorded motion traces.

## Versions

| Version | Implementation |
|---|---|
| V1 · Original native scrolling | Queues card geometry updates from native scroll events. |
| V2 · MD3-timed settling | Uses a custom animation clock and writes native scroll positions each frame. |
| V3 · Synchronized visual settling | Positions the artwork explicitly and synchronizes native scroll at completion. |
| V4 · Boundary clamping | Clamps overscroll and adds layout containment and compositor hints. |
| V5 · Current baseline | Keeps the sticky track and boundary clamping, without the layout hints. |
| V6 · Fixed masks | Freezes card widths to isolate position updates. |
| V7 · Native-flow control | Uses fixed-width cards in normal flow. |
| V8 · Whole-pixel settling | Rounds positions during custom settling. |
| V9 · Custom touch settling | Switches from native dragging to custom animation at touch release. |

V8 looks comparable to V5 on PC and serves as the iOS target. V9 can settle more smoothly on iOS, then make a late correction or overscroll:

![Cards displaced far to the right after a slight touch, then back at their resting edge.](site/assets/overscroll-annotated.webp)

Measurements and test results are in [FINDINGS.md](FINDINGS.md).

## Record a test

Choose a version and layout, press **Start recording**, and drag or scroll the carousel. Let it settle, then press **Stop recording** and **Download JSON**.

The JSON contains browser and display settings, runtime hashes, input events, frame timestamps, native scroll offsets, and assigned CSS values. Pair it with a screen recording to compare those values with the rendered motion.

Nothing is uploaded. The last five recordings survive playground settings changes. Download them before reloading or closing the tab. Recording stops when the page is hidden or after 60 seconds.

The release traces plot these positions against time after the recorded input event. The 300 ms MD3 curve is a reference for custom settling. Native browser scrolling uses its own timing. Select **Your recording**, then **Choose JSON** to load a JSON export, select a capture, and align time zero to a release event or a timestamp. The native target and tracked card edge are adjustable.

## Contribute

[Open a pull request](https://github.com/sojupie/carousel-motion-lab/compare) with a fix or smaller reproduction. Include the version, browser, device, input method, and a before-and-after recording. [Open an issue](https://github.com/sojupie/carousel-motion-lab/issues/new) for reproduction steps or measurements.

Keep the cards’ changing widths and the artwork’s proportions. Preserve vertical page scrolling, pinch zoom, keyboard navigation, and reduced motion. Check slow dragging, release, and interruption.

## Run locally

Requires Node.js and Python. No package dependencies.

```sh
npm run build
npm test
python3 -m http.server 8083 --directory site
```

Open [localhost:8083](http://localhost:8083/). Allow port 8083 through the firewall to test from another device on the same network.

- `src/`: carousel code and styles; earlier versions are in `src/history/`.
- `site/`: page, recorder, traces, media, and generated runtimes.
- `scripts/build.mjs`: builds the nine versions and hashes their assets.
- `tests/`: interaction, recording, and build checks.

Run `npm run build` after editing code or page assets. Commit the generated files in `site/` for static hosting.

## Publish

After committing the rebuilt site:

```sh
git push origin main
./scripts/publish.sh
```

The script builds, tests, and pushes `site/` to the `gh-pages` branch.

[Business Source License 1.1](LICENSE). Font and icon licenses are in [`site/assets/`](site/assets/).
