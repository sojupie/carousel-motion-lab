# Carousel Motion Lab

A comparison of carousel implementations that have shown stuttering during dragging and settling on desktop and touch devices. Cards change visible width as they move, while the artwork inside keeps its size. The goal is to keep that effect moving continuously, including at low speed.

**[Open the experiments](https://sojupie.github.io/carousel-motion-lab/)** · [Findings](FINDINGS.md)

The original symptom is uneven movement: brief holds, small jumps, and a rough final settle. It was observed on desktop as well as on iPhone and iPad. Later implementations improved some paths; the remaining behavior depends on the version and input. The newer touch-handoff experiment also introduced a separate jump and overscroll failure. That regression does not define the whole investigation.

## Experiments

| Implementation | What changes | How to test |
|---|---|---|
| Original | Native smooth scrolling with queued scroll-driven geometry updates. | Compare slow dragging, native release and arrow buttons. Stuttering was reported on desktop and iOS. |
| Token clock | Adds token-timed custom settling and transform positioning, with per-frame native scroll writes. | Compare with Original; this is an early intermediate implementation. |
| One visual clock | Removes per-frame native writes during custom settling and uses explicit fractional artwork positioning. | Desktop motion improved; touch jitter and stuttering remained. |
| Overscroll clamp + hints | Clamps out-of-range offsets and adds layout/compositing hints. | Reported directional jitter improved; settling still needed work. |
| Current baseline | Removes the layout hints, retaining the sticky track and clamp. | Later desktop tests felt smoother; native touch settling still stepped. |
| Fixed masks | Freezes widths and artwork offsets; positions still follow native scroll values. | Did not fix the reported stutter. Gaps/overlaps make this a confounded diagnostic. |
| 1 · Native scrolling | Fixed-width cards in normal flow. No changing masks. | Touch/trackpad control; no custom mouse dragging. Initially felt smoother on phones. |
| 2 · Rounded clock | Rounds the custom clock’s paint input to whole CSS pixels. | Compare arrow buttons with Current baseline arrows. Touch release is unchanged. |
| 3 · Touch handoff | Native dragging followed by fractional custom settling. | Initially felt smoother, but later flicks showed corrections and boundary overscroll. |

Use the same device, layout, size, width, direction, and input when comparing versions. The default is Original / Uncontained / Large / 640 px maximum width / LTR. The page explains each version and its observed limits before drawing conclusions from a comparison. Query parameters preserve the selected settings, for example `?version=touch-handoff&variant=uncontained&size=large&width=640&direction=ltr`.

## Record a test

1. Load the implementation and settings.
2. Press **Start recording**.
3. Interact with the carousel. Several gestures can be included in one recording.
4. Wait for the motion to finish, then press **Stop recording**.
5. Press **Download JSON**. On iOS, save the file to Files and transfer it as needed.

Recording never starts from a gesture alone. Hiding the page or reaching 60 seconds also stops an active recording. The last five recordings remain in tab memory; download them before changing settings or reloading. There are no automatic uploads or persistent recordings.

The report contains the configuration, runtime hashes, browser details, DPR, viewport scale, input-event timestamps, native scroll offsets, and assigned item styles sampled through `requestAnimationFrame`. It does not measure compositor transforms or rendered pixels. Recording adds work: repeat the test without it as a comparison. Review the browser/device information before sharing a report.

A matching screen recording is useful. Describe which implementation and gesture looked wrong; a JSON trace alone cannot establish visual smoothness. A cropped video on the page shows why this distinction matters.

## Run locally

No packages need to be installed. Node builds the static runtimes and runs the small test suite; Python can serve the files:

```sh
npm run build
npm test
python3 -m http.server 8083 --directory site
```

Open `http://localhost:8083/`. For another device on the same network, bind the server to the local network interface and allow that port through the firewall.

## Repository layout

- `src/`: frozen masked baseline, native control, and touch-handoff experiment. `src/history/` preserves the earlier implementations and fixed-mask diagnostic.
- `scripts/build.mjs`: creates the nine static implementation/diagnostic runtimes and SHA-256 manifest. The rounded and handoff experiments each start from Baseline.
- `site/`: the single-page site, explicit recorder, fixture theme, generated runtimes, and cropped evidence.
- `tests/`: checks for touch-handoff direction/gesture guards and explicit recording behavior.
- `FINDINGS.md`: observations, interpretation, and unresolved questions.

Generated runtimes are committed so GitHub Pages can publish `site/` without installing dependencies. Run the build after editing `src/`. The build checks that each injection point occurs exactly once instead of silently patching the wrong code.

## Hosting

GitHub Pages publishes the `site/` directory from the `gh-pages` branch. `scripts/publish.sh` checks the build and tests, then updates that branch from `main` without rewriting the source branch. The Pages source is the root of `gh-pages`. No custom domain is required.

## Evidence and scope

The fixture uses static theme values, inline SVG artwork, an 8 px gap, 28 px corners, and a 300 ms standard MD3 easing curve. It has no external fonts, frameworks, or analytics. It is an investigation fixture, not a complete component library.

The primary evidence shows the small settling steps, with a magnified card edge and a cropped silent clip. A second annotated image and clip show the separate touch-handoff overscroll regression. Both examples are from supplied iPhone recordings; desktop stutter remains in scope even though the available paired video/trace evidence is from iOS. Browser chrome and local network details are excluded. Raw recordings and device JSON reports are not published. The baseline's source revision is `c13bc6a`; the experiment runtime hashes identify the exact files used in new reports. The original temporary experiment references were `078f82b` (Native), `380e332` (Rounded), and `4e72069` (Touch handoff).

The source retains the Business Source License 1.1 terms in [LICENSE](LICENSE).
