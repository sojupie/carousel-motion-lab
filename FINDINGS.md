# Findings

These observations come from supplied device captures and screen recordings. They support a direction for investigation; they do not establish a universal browser defect.

## The original problem and implementation history

The investigation began with stuttering on desktop web as well as iOS, especially during the final part of a release. A slow drag and the movement of the image inside a changing card mask were also reported as rough. The target is continuous visible movement through those stages, not merely smooth fast arrow-button animations.

The Original, first Token clock, One visual clock, Overscroll clamp + hints, and Current baseline versions are all preserved. Earlier desktop behavior was rough; later desktop behavior improved. That does not make the issue uniquely iOS or establish one shared cause for every version.

The first changes introduced a fractional token clock and transforms. A later version removed native scroll writes from custom animation frames and gave artwork an explicit fractional position. Overscroll clamping then addressed a separate directional jitter problem, and layout hints were removed to return to a plain sticky baseline. Native touch settling continued to show the stepped tail. The fixed-mask diagnostic and the three newer controls isolate parts of these interactions with known limits.

The detailed touch traces below provide evidence for one remaining path. They do not retrospectively diagnose every earlier desktop implementation. The touch-handoff jump is a regression in one newer experiment, distinct from the original low-speed stuttering.

## Stepped native input

Two native-touch captures contained 442 frame samples in total. Every sampled native horizontal offset was a whole CSS pixel, at DPR 2 on iPad and DPR 3 on iPhone. Near the snap target, final one-pixel advances were separated by roughly 50–116 ms. Frame callbacks continued, with median intervals around 17 ms.

The assigned card geometry matched those sampled offsets. Repeated offsets therefore produced repeated assigned geometry. The multi-browse endpoint blend is not required: the captures also reproduce the behavior with Uncontained and Full-screen layouts.

This supports investigating the reconstruction of motion from sampled native offsets. It does not prove that native rendering itself steps at those intervals. A scrolling compositor can move content independently of the values available to JavaScript.

## Input paths differ

Touch release in Baseline uses native inertia and CSS scroll snapping. Button, keyboard, and mouse-drag release use a targetless Web Animations clock with fractional progress, applying a 300 ms standard MD3 easing curve.

In a desktop mouse capture, native offset remained fixed during custom settling while assigned geometry changed fractionally; the native offset was synchronized at completion. Desktop mouse and iOS touch results are therefore not a controlled comparison of the same scrolling path.

## Native and handoff controls

Initial phone feedback described Native scrolling and Touch handoff as smoother than the other tested paths, though not necessarily perfect.

Native preserves ordinary browser visual scrolling. It still exposes integer native offsets in the captured iPhone report, but those readings do not drive its card transforms. This supports the sampled-input explanation when paired with the visual feedback.

Touch handoff produces fractional assigned positions at frame cadence. However, native scrolling can keep moving at the same time. Two opposite-direction flick captures show the clock reaching its target, followed by native offsets departing by 6 and 7 CSS px. Assigned geometry follows those late departures into a second stepped settle.

Target selection agrees with the signed projected velocity in those captures. The failure is not simply an incorrect destination: the experiment does not maintain exclusive ownership of the motion through the handback.

## Boundary overscroll is a visible failure

The [annotated frames](site/assets/overscroll-annotated.webp) and [cropped video](site/assets/overscroll.mp4) show a return from item 2 to item 1 in Touch handoff. The card layer moves far right and leaves most of the viewport blank before returning.

The associated trace reports native offset reaching −275 CSS px while the custom animation assigns the first card a zero horizontal translation. At custom completion the raw offset is still −50, reaching zero later. Smooth assigned styles do not establish smooth rendered movement.

The baseline clamps negative LTR offsets to zero for geometry calculations. This prevents those negative readings from reversing the mathematical movement, but it does not suppress native rubber-banding of the scrolling/sticky layer. It can also hide late native activity from child-style-only telemetry.

The video and trace describe the same transition, but their clocks are not synchronized to frame accuracy. The illustration labels video presentation times only. No exact compositor transform was captured.

## Device observations

Stuttering was reported on PC in earlier implementations. Later desktop paths improved, while further tests reproduced remaining touch problems on iPhone 15, iPhone 13 Pro Max, and iPad Air (5th generation), across iOS Safari, Chrome, Firefox, and Brave tests. A reported later test on a MacBook Air M4 did not show the problem. That result does not describe every previous implementation or input path. This is user feedback across tests, not a benchmark matrix proving that every browser/device pair behaves identically.

## What remains unresolved

- Which mechanisms account for the earlier desktop stutter, and whether any are shared with the remaining touch path.
- Whether residual inertia, deferred programmatic scroll writes, snap restoration, or their interaction causes each late native departure.
- Whether a horizontal gesture path with one motion owner can preserve the desired drag behavior while keeping native vertical page scrolling and pinch zoom.
- How interruption, rapid flicks, RTL, focus, reduced motion, resize, and both boundaries behave after any further change.

A fix must be checked with rendered behavior on affected devices, not only with fractional style values or passing desktop tests. The existing Touch handoff remains available as an experiment with known failures.
