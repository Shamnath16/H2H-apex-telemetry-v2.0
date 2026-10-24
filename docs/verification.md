# Verification record — 24 October 2026

- TypeScript: `tsc --noEmit` passed.
- Production build: Sites build helper / Vinext completed successfully.
- Browser: latest available Austin Practice 2 session loaded real OpenF1 timing, driver selection, traces and circuit map.
- Browser: switching from Speed to Throttle remained responsive during the first model download.
- Browser: Qwen model loaded locally and generated a constrained, validated brief preserving the 0.042 s lap delta, 0.374 s sector gain and 339 vs 332 km/h speed values.
- Regression fixed: initial worker URL used `file:///`; replaced with Vite's worker import.
- Regression fixed: unconstrained small-model prose invented a time; only validated fact indexes now reach the rendered brief.
- Endpoint: current-year session request returned 131 records; an unbounded car-data query was rejected with HTTP 400.
- UI: desktop layout visually inspected. Mobile CSS is implemented, but a physical mobile device and every breakpoint were not tested.
- Build warns that some chunks exceed 500 kB; the AI engine is lazy-loaded and model weights are fetched only after a click.
- GitHub Actions is configured but its first hosted run is separate from these local checks.
- FIA links are references only. Automated document ingestion, background refresh while closed, and distance-aligned telemetry are not implemented.

No claim is made that every device/browser or every historical session is bug-free. OpenF1, MultiViewer and model asset availability remain external dependencies.
