# Architecture

## Data path

Browser selectors -> `/api/telemetry/:endpoint` -> OpenF1. Only sessions, drivers, laps and car_data endpoints are supported. Car data requires a single driver/session and a finite positive time window of at most 400 seconds. The endpoint never accepts an arbitrary upstream host.

The worker caches successful arrays for 60 seconds (sessions), five minutes (nonempty timing/telemetry), or 30 seconds (empty responses). At most 60 entries remain per isolate. Concurrent identical requests share a promise. Cache is best-effort and per isolate, not persistent storage. Upstream failures produce an explicit error and are not cached as empty success.

The UI discovers completed sessions from the current year. The most recent completed session is selected initially. User selections are retained on discovery refresh while still available. The refresh button reloads both session discovery and selected timing. React effect lifecycles prevent stale responses from replacing newer selections.

## Components

- `app/page.tsx`: session/driver/lap selection, measured summaries, telemetry charts, sector comparison.
- `app/track-map.tsx`: MultiViewer geometry, with OpenF1 GPS fallback and explicitly estimated turn labels.
- `app/local-analysis.tsx`: lazy WebLLM import, startup progress, cancellation, output and failure states.
- `app/summary.worker.ts`: WebLLM inference isolated from the UI thread.
- `app/api/telemetry/[endpoint]/route.ts`: bounded upstream adapter.
- `app/globals.css`, `app/track-map.css`: AMOLED interface and responsive layouts.

## AI contract

Supply only already-calculated facts. Qwen returns a constrained JSON array selecting three distinct fact indexes. The app validates the indexes and renders the corresponding original facts verbatim, followed by a fixed limitations sentence. Free-form model prose is never displayed. Invalid output falls back to measured insights. This design was adopted after a browser test showed the small model inventing a lap time when asked to rewrite facts.

A revision counter invalidates results when comparison changes or the user cancels. Worker termination releases resources and prevents an old result being shown for a new comparison. AI is initiated only by a user click; downloading large model weights is never part of initial page load.

## Design

Pure black canvas, near-black surfaces, red reference trace, white dashed comparison trace. Labels A/B and different line styles supplement color. Formula1 display faces are self-hosted; body text uses system fonts and timing uses monospaced digits. Model files are external and cached by WebLLM.

## Next development priorities

1. Distance-aligned telemetry with explicit interpolation quality and coverage checks.
2. Stint/compound/tyre-age context and deleted-lap filtering.
3. A persistent, scheduled FIA document ingestion pipeline with event/team source attribution and manual verification.
4. Long-run pace, race strategy and degradation analysis with uncertainty indicators.
5. User-tested mobile layouts and supported-device local inference benchmarks.
