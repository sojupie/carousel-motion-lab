# Findings

## Stutter

Earlier implementations stuttered on desktop and iOS, especially during slow dragging and the final settle. Later versions improved desktop behavior. Native touch settling continued to show holds and small jumps.

The implementation history preserves those changes: token-timed settling, transform positioning, explicit artwork offsets, scroll synchronization, and overscroll clamping. The newer Touch handoff experiment also introduced late corrections and boundary overscroll.

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

All six annotated recordings share a 16:9 frame and a persistent hold history. The iOS settling clip shows three-pixel advances in recording coordinates, with 67–117 ms holds. Hold durations use source timestamps; frame counts use captured frames.

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
