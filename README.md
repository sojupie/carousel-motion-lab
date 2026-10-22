# Carousel Motion Lab

A small browser experiment for investigating carousel settling on iOS. It compares native scrolling with a sticky visual layer that changes card masks as items move.

**[Open the experiments](https://sojupie.github.io/carousel-motion-lab/)** · [Findings](FINDINGS.md)

The goal is smooth dragging and release with crisp, changing masks, while preserving vertical page scrolling, keyboard access, RTL layout, and reduced motion. The current experiments isolate different parts of that interaction. None is a production-ready fix.

## Experiments

| Implementation | What changes | How to test |
|---|---|---|
| Baseline | Native touch offsets drive masked cards on a sticky track. Buttons and mouse release use a fractional animation clock. | Swipe, release, and watch the final movement. Compare buttons separately. |
| 1 · Native scrolling | Fixed-width cards move in normal flow. No sticky visual projection or changing masks. | Use touch or a trackpad. Custom mouse dragging is intentionally absent. |
| 2 · Rounded clock | The custom clock's paint input is rounded to whole CSS pixels. | Compare arrow buttons with Baseline arrows. Touch release is unchanged. |
| 3 · Touch handoff | Native dragging hands release to the existing 300 ms MD3 clock. | Test both directions, fast flicks, interrupted settling, boundaries, RTL, and vertical scrolling. Native movement can continue after release. |

Use the same device, layout, size, width, direction, and input when comparing versions. The default is Uncontained / Large / 640 px maximum width / LTR. Query parameters preserve the selected settings, for example `?version=touch-handoff&variant=uncontained&size=large&width=640&direction=ltr`.

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

- `src/`: frozen masked baseline, native control, and touch-handoff experiment.
- `scripts/build.mjs`: creates the four static runtime files and SHA-256 manifest. The rounded and handoff experiments each start from Baseline.
- `site/`: the single-page site, explicit recorder, fixture theme, generated runtimes, and cropped evidence.
- `tests/`: checks for touch-handoff direction/gesture guards and explicit recording behavior.
- `FINDINGS.md`: observations, interpretation, and unresolved questions.

Generated runtimes are committed so GitHub Pages can publish `site/` without installing dependencies. Run the build after editing `src/`. The build checks that each injection point occurs exactly once instead of silently patching the wrong code.

## Hosting

GitHub Pages publishes the `site/` directory from the `gh-pages` branch. `scripts/publish.sh` checks the build and tests, then updates that branch from `main` without rewriting the source branch. The Pages source is the root of `gh-pages`. No custom domain is required.

## Evidence and scope

The fixture uses static theme values, inline SVG artwork, an 8 px gap, 28 px corners, and a 300 ms standard MD3 easing curve. It has no external fonts, frameworks, or analytics. It is an investigation fixture, not a complete component library.

The annotated image and silent video are cropped from a supplied iPhone recording. Browser chrome and local network details are excluded. Raw recordings and device JSON reports are not published. The baseline's source revision is `c13bc6a`; the experiment runtime hashes identify the exact files used in new reports. The original temporary experiment references were `078f82b` (Native), `380e332` (Rounded), and `4e72069` (Touch handoff).

The source retains the Business Source License 1.1 terms in [LICENSE](LICENSE).
