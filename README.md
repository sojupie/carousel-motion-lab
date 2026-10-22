# Carousel Motion Lab

Carousel implementations for reproducing stutter during slow dragging and settling on desktop and touch devices. Card masks change width as they scroll; the artwork retains its size. The goal is continuous motion through dragging, release, and interruption.

**[Experiments](https://sojupie.github.io/carousel-motion-lab/)** · [Findings](FINDINGS.md)

## Versions

| Version | Change | Observed result |
|---|---|---|
| Original | Native smooth scrolling with queued geometry updates. | Stutter on desktop and iOS. |
| Token clock | MD3-timed settling with native scroll writes on each frame. | Remaining roughness during settling. |
| One visual clock | Fractional settling and artwork offsets with native synchronization at completion. | Smoother desktop motion with remaining touch jitter and stutter. |
| Overscroll clamp + hints | Boundary clamping with layout containment and compositor hints. | Reduced directional jitter with remaining settling stutter. |
| Current baseline | Sticky track and boundary clamping without layout hints. | Smoother desktop motion with remaining touch settling steps. |
| Fixed masks | Fixed mask widths and artwork offsets with scroll-driven positions. | Remaining stutter, gaps, and overlaps. |
| 1 · Native scrolling | Fixed-width cards in normal flow. | Smoother initial phone tests; desktop scroll-wheel settling still steps. |
| 2 · Rounded clock | Whole-pixel positions during custom settling. | Smooth mouse-release settling in the latest desktop test. |
| 3 · Touch handoff | Native dragging followed by fractional custom settling. | Smoother initial settling with late corrections and boundary overscroll. |

Compare slow drags, release, and arrow-button navigation with the same device and settings. The Native control supports touch, trackpad, and scroll-wheel input. The Rounded control changes arrow-button and mouse-release settling.

Default settings: Original, Uncontained, Large, 640 px maximum width, LTR. Query parameters retain the configuration:

```text
?version=touch-handoff&variant=uncontained&size=large&width=640&direction=ltr
```

## Recording

1. Load the implementation and settings.
2. Press **Start recording**.
3. Perform the gestures.
4. Press **Stop recording** after the carousel settles.
5. Press **Download JSON**.

Each recording can contain several gestures. Recording also stops when the page is hidden or the 60-second limit is reached. The last five recordings stay in tab memory. Download before changing settings or reloading.

Reports contain browser and display settings, runtime hashes, input events, frame timestamps, native scroll offsets, and assigned CSS values. Data stays in tab memory until downloaded. Pair the JSON with a screen recording to compare CSS values with rendered motion. Repeat without recording to check instrumentation overhead.

## Local development

Node builds the static files and runs the tests. Python serves the site. There are no package dependencies.

```sh
npm run build
npm test
python3 -m http.server 8083 --directory site
```

Open `http://localhost:8083/`. For LAN access, bind the server to the network interface and allow the port through the firewall.

## Files

- `src/`: baseline, native control, and touch-handoff code.
- `src/history/`: earlier implementations and the fixed-mask diagnostic.
- `scripts/build.mjs`: runtime generation, hashes, and page asset URLs.
- `site/`: page, recorder, styles, generated runtimes, and visual evidence.
- `tests/`: recording, gesture, runtime, and snapshot checks.
- `FINDINGS.md`: measurements and open questions.

Each generated version starts from its own snapshot or the current baseline. The build checks each injection point and hashes the output. Run `npm run build` after editing source or page assets. Generated files are committed for static hosting.

## Publishing

```sh
git push origin main
./scripts/publish.sh
```

The publish script builds, tests, and pushes the static site to `gh-pages`. GitHub Pages serves that branch’s root directory.

## Evidence

The page includes six annotated desktop and iOS recordings. Each uses a 1280 × 720 frame, with the component on the left and a persistent hold history on the right. Regular settling plays at ¼ speed; the handoff jump plays at ⅛ speed. Each clip ends with a four-second freeze and links to its hold summary. Raw videos and device reports remain local. Runtime hashes identify the files used in each report.

The fixture uses inline SVG, static colors, an 8 px gap, and 28 px corners. Custom settling uses Material Design 3 (MD3) standard easing over 300 ms.

## Material styles

`site/material.css` contains only the light/default tokens and component rules used by the page’s filled, tonal, outlined, and icon buttons. The snapshot is 54 KB uncompressed (5.2 KB gzip). `site/styles.css` handles page layout and applies the extracted color, shape, and typography tokens. Native selects use those tokens for their borders, surfaces, and text. The page self-hosts Roboto and embeds two Material Symbols as SVG paths; no icon font or full theme stylesheet is loaded.

The frozen carousel palette and 300 ms timing remain scoped to each specimen. Page controls use CSS state layers and pressed shapes. The lab does not load a shared interaction runtime into the experiments.

To refresh the Material snapshot from the source repository and its generated theme:

```sh
node scripts/extract-material.mjs /path/to/tokens /path/to/theme.css
npm run build
```

The refresh script uses the source repository’s installed PostCSS. Serving and building this repository still require no package dependencies. Roboto’s license is in `site/assets/fonts/OFL.txt`. The inline chevrons are Google Material Symbols Outlined (24px), licensed under Apache-2.0; see [the source](https://github.com/google/material-design-icons/tree/master/symbols/web).

## Contributing

[Open a pull request](https://github.com/sojupie/carousel-motion-lab/compare) with a fix or a smaller reproduction. Include the implementation tested, browser, device, input method, and a before-and-after recording. Keep changing card masks, vertical page scrolling, keyboard navigation, RTL, and reduced motion working.

[Open an issue](https://github.com/sojupie/carousel-motion-lab/issues/new) for measurements or reproduction steps.

Source license: [Business Source License 1.1](LICENSE).
