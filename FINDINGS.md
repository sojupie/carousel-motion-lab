# Findings

## Stutter

The main problem is the last part of the release: the card edge pauses and then moves in small steps. It has appeared on desktop and iOS. Later versions improved desktop behavior. Native touch settling still showed the pauses.

The attempts changed the animation clock, artwork positioning, scroll synchronization, and boundary handling. Touch handoff introduced a separate problem: large overscroll and late corrections.

![The edge holds across two frames, then advances.](site/assets/settling-edge.webp)

## Native offsets

Two native-touch captures contained 442 frame samples: DPR 2 on iPad and DPR 3 on iPhone. Every sampled horizontal offset was a whole CSS pixel. Final 1 CSS px advances arrived 50–116 ms apart. Frame callbacks continued around every 17 ms.

Assigned card geometry followed those offsets, producing repeated positions between updates. The behavior appeared in Uncontained and Full-screen layouts as well as Hero. The multi-browse endpoint blend is therefore not required to reproduce it.

## Input paths

Current baseline:

| Input | Dragging | Settling |
|---|---|---|
| Touch | Native scrolling | Native inertia and CSS scroll snap |
| Mouse | Scripted dragging | Fractional animation clock |
| Trackpad | Native scrolling | Native inertia and CSS scroll snap |
| Arrow buttons | — | Fractional animation clock |
| Keyboard | — | Fractional animation clock |

Custom settling uses a targetless Web Animations clock with a 300 ms duration and MD3 standard easing. A desktop mouse capture shows fractional geometry updates during settling, followed by native scroll synchronization at completion.

## Diagnostic results

| Experiment | Result |
|---|---|
| Fixed masks | Remaining stutter with gaps and overlaps. |
| Native scrolling | Smoother initial phone tests; desktop scroll-wheel settling still steps. |
| Rounded clock | Smooth mouse-release settling in the latest desktop test. |
| Touch handoff | Smoother initial motion with late native corrections. |

Native scrolling moves fixed-width cards in normal flow. Its sampled offsets remain integer-valued in the iPhone trace.

Touch handoff produces fractional CSS positions during release. Two opposite-direction flick captures then show native offsets departing from the target by 6 and 7 CSS px. Card geometry follows those departures into a second stepped settle.

Both captures select the expected target from the projected velocity. Native scrolling continues after the custom clock reaches that target.

## Desktop comparison

The latest PC comparison used Firefox on Linux. Original and Native felt stuttery; Rounded felt smooth. Eight JSON recordings used mouse drag and release. The Native JSON used an arrow button; its later video used the scroll wheel.

Original’s JSON shows final native scroll increments of about 1.12 CSS px with a 77 ms hold before the final increment. Native’s arrow-button trace shows a 118 ms final hold. Frame callbacks continue about every 7 ms. The custom clocks keep assigning fractional positions through the release tail, except Rounded’s deliberate whole-pixel steps.

The annotated desktop videos show 50–67 ms holds followed by one-pixel advances in Original and Native. Rounded finishes sooner. Its smooth appearance suggests that integer positions alone do not explain the reported stutter. The Native video reproduces the symptom without changing card masks or a sticky visual track.

The desktop target is Rounded, which looks comparable to the current baseline in these tests. Its two-frame hold is acceptable. The goal is to match that settling quality on iOS. Browser scrolling and DOM rendering may limit further improvement.

All six retained annotated recordings share a 16:9 frame and a persistent hold history. The iOS settling clip shows three-pixel advances in recording coordinates, with 67–117 ms holds. Hold durations use source timestamps; frame counts use captured frames.

## Earlier iOS experiment comparison

The Native capture reaches its target 586 ms after finger release. Its last 1 CSS px advance follows a 100 ms hold across six recorded samples. Rounded’s touch capture reaches the target after 578 ms and has the same final 100 ms hold. Rounded changes the custom clock used by mouse release and buttons; this finger release follows the native path.

The stable Touch handoff capture supplies 21 distinct CSS positions over 322 ms, with a median sampling interval of 17 ms. It remains at the target afterward. The failing flick also supplies a different CSS position at each sample during the custom release, then jumps 6 CSS px away and returns with holds reaching 100 ms.

The page’s release timeline uses these four captures. Native is shown through scroll offsets; scripted geometry is shown through assigned CSS positions.

## Latest iOS captures

Native (`bb7c4ee6`) releases at capture time 1332 ms and reaches offset 328 at +725 ms. Its moving holds reach 117 ms; the final 1 px advance follows a 101 ms hold. Rounded (`c01cdbba`) has two arrow presses before the actual carousel touch. Its in-viewport release is 5837 ms, not either button's outside-viewport `touchend`. It reaches offset 656 at +731 ms; the last two holds last 116 ms and 100 ms.

Touch handoff (`b6370a93`) has releases at 408, 1342, 2517, and 3276 ms. The first three reach their selected targets in 332, 332, and 323 ms and remain there until the next gesture. The last selects index 4 (item 5), with a projected position of 773 + 560 px. At +307 ms the assigned CSS position is 1311.796431. At +324 ms it is 981: a 330.796431 px reversal in one sampled interval. It then advances to 982, 983, and 984, with 32, 67, and 117 ms holds. It finishes at item 4 rather than the selected item 5.

The other Touch handoff capture (`c39d0536`) reaches offsets 328 and 0 in 330 ms and 329 ms. The second release records native offsets down to −229 while assigned CSS geometry approaches zero. That remains evidence of boundary overscroll, separate from the full-item rollback above.

The supplied touch videos show related correction behavior in different gestures. The one-second video reaches item 3, shifts slightly, then returns. The final release in `b6370a93` instead approaches item 5 and returns to item 4; its 331 px change does not describe that video. The Native video's tracked edge advances in individual recording pixels during its tail, while the JSON exposes integer CSS offsets. At DPR 3, those are different sampling scales. Offset holds alone cannot establish compositor frame holds.

Each website trace has a time axis aligned to the in-viewport `touchend`, with earlier samples retained. No sample is shifted to zero or interpolated. The target for Touch handoff comes from its experiment event, not the final resting offset; using the latter would conceal the wrong-item finish.

## Boundary overscroll

The [annotated frames](site/assets/overscroll-annotated.webp) and [video](site/assets/overscroll.mp4) show item 2 returning to item 1. The card layer shifts right and leaves most of the viewport blank.

The paired trace reaches −275 CSS px of native overscroll with the first card’s own translation fixed at zero. At custom completion, the raw offset is still −50 CSS px. It returns to zero later.

The baseline clamps negative LTR offsets to zero for geometry calculations. Native rubber-banding continues to move the scrolling layer. The video shows that displacement outside the recorded child styles.

## Device reports

| Device | Reported behavior |
|---|---|
| PC | Reduced stutter in later tests. |
| iPhone 15 | Remaining touch stutter. |
| iPhone 13 Pro Max | Remaining touch stutter. |
| iPad Air, 5th generation | Remaining touch stutter. |
| MacBook Air M4 | No stutter in the later test. |

The iOS tests included Safari, Chrome, Firefox, and Brave. The available frame and offset measurements come from the supplied touch captures. Earlier desktop causes remain open.

## Open questions

- Causes of the earlier desktop stutter.
- Contributions from residual inertia, deferred scroll writes, and snap restoration.
- Horizontal gesture ownership alongside native vertical panning and pinch zoom.
- Handoff behavior during rapid swipes, interruption, and direction changes.
- Boundary, RTL, resize, focus, and reduced-motion behavior.

## Original and Baseline, matched fixture

The new captures use Uncontained / Large / LTR, a 396 px viewport, 320 px cards, 8 px gaps, and DPR 3. The return gestures release at 132 px (Original) and 130 px (Baseline). Their sampled offsets reach zero after 748 ms and 739 ms; both spend 450 ms covering the final 10 px. Original's final holds are 100 and 116 ms; Baseline's are 116 and 100 ms.

Original's forward/backward swipes traverse 268 px at the track's end and settle in 632/607 ms. Baseline traverses 328 px at the start and settles in 683/657 ms. These are different travel distances. All six offset trajectories are monotonic. Original's assigned geometry follows the previous captured offset; Baseline follows the current one.

The new Original and Baseline videos replace the earlier iOS settling clip in the main evidence section. At the end of the backward swipes, both show measured edge holds of 83, 100, and 117 ms. The separate touch correction video has a 16-recording-pixel displacement at source time 0.483 s, then returns. It is not the 331 CSS px rollback in the JSON.

Annotation decoding preserves variable source timestamps with FFmpeg passthrough. Playback duration follows those timestamps rather than assuming each captured frame lasts 1/60 second. Hold counts refer to captured frames; durations come from the source timestamps. Clips and summary images retain the last six completed holds, with full measurements in `site/assets/recordings/ios-measurements.json`.

## Focused annotation cuts

Original and Baseline now contain three short settling tails, ordered return / forward / backward. Original uses source 11.800–12.317, 5.983–6.400, and 8.350–8.750 s. Baseline uses 8.750–9.250, 3.700–4.133, and 5.400–5.883 s. Neither includes the earlier dragging or pauses. The Native and Rounded cuts show only the slow tail.

The smooth Touch handoff return uses source 0.600–0.950 s and has no repeated captured edge positions before rest. Its preceding dragging and pause were wrongly included in the earlier annotation. A hold now requires at least two captured frames at the same tracked edge. A long interval after one captured frame is not classified as a hold. The successful return is presented as target quality, with a one-second final freeze.

## Target curve

The time plots overlay a 300 ms `cubic-bezier(0.2, 0, 0, 1)` reference. The curve starts at each gesture's latest sampled CSS position at or before release, falling back to its native offset for Native. It reaches the same intended target after 300 ms. This is the MD3 standard curve used by custom settling, not a measured desktop trajectory or a fitted native inertia model. Recorded paths remain sample-and-hold steps; only the reference is continuous. Scrubbers have been removed in favor of labeled time axes.

## PC input events and full-distance plots

All nine PC captures are included. Eight use the first in-viewport mouse `pointerup` after dragging. Native uses its recorded `arrow-button` event; its preceding mouse gestures do not supply the transition being plotted. The eight return captures and Native's button transition are separate gesture groups. Every plot names its input event and capture-relative timestamp. iOS remains anchored to `touchend`.

Full distance is the default view. The former magnified view capped distances at 10 px and drew a misleading flat segment until the motion entered that range. Off-scale paths now leave the plot instead. The optional final-10-pixel view retains the actual time origin.
