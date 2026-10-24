# H2H APEX Telemetry v2.0

An AMOLED Formula 1 telemetry workbench: compare two drivers and timed laps, inspect speed/throttle/brake/gear traces, read sector deltas, and generate a free local engineering brief.

**Live site:** https://f1-telemetry-lab-2026.gnshamnath16.chatgpt.site.

## Features

- Black, red and white interface with responsive driver cards, circuit map, keyboard focus states and reduced-motion support.
- Completed FP1, FP2, FP3, qualifying, sprint qualifying, sprint and race sessions from OpenF1.
- Current-year session discovery every five minutes while the page is open, plus manual refresh.
- Two selected laps, fastest timed laps by default, driver swap, sector differences and four telemetry channels.
- Same-origin telemetry endpoint with bounded lap requests, short caching, concurrent request deduplication and upstream timeout.
- Free Qwen 2.5 0.5B Instruct commentary using WebLLM in a separate browser worker. No API keys or paid inference service.
- Always-available deterministic measured insights; AI selects the emphasis while verified source facts are preserved verbatim.
- Links to FIA event documents and the dated 2026 United States car presentation submission.

## Run locally

Requires Node.js 22.13 or newer and pnpm 11.25.0.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open the local URL printed by Vite (normally http://localhost:5173).

```sh
pnpm typecheck
pnpm build
pnpm start
```

`pnpm start` runs the built Cloudflare Worker locally. Use the Sites publication workflow for hosted deployment; a GitHub push alone does not deploy the Site.

## Free AI

Click **Generate AI brief** after both traces load. The browser downloads Qwen model weights on first use (several hundred MB), caches them, and performs inference on the visitor's GPU. Current WebGPU-capable Chrome or Edge on suitable hardware is recommended. Model loading and generation are cancellable; changing the comparison terminates stale work. The worker is released after generation to free GPU resources.

No telemetry is submitted to a hosted AI provider. Model assets are fetched from the public URLs configured by WebLLM. Network access, sufficient storage/GPU memory, WebGPU and compatible drivers are required. Unsupported devices keep the measured summary. Local generation is free of API charges, but consumes the visitor's bandwidth, power and compute.

Model: [Qwen2.5-0.5B-Instruct](https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct), Apache 2.0. Runtime: [WebLLM](https://github.com/mlc-ai/web-llm), Apache 2.0. Model and runtime licenses do not cover the site's Formula 1 assets.

## Reading the data correctly

- Timing and telemetry come from [OpenF1](https://openf1.org/docs/). Historical access is free; real-time access requires a paid OpenF1 subscription and is not configured here.
- Sample rate is approximately 3.7 Hz. Traces align by relative elapsed lap time, **not physical track distance**. They are unsuitable for exact corner braking-point claims.
- Full-throttle share is the fraction of available samples at >=95% throttle, not a time-weighted calculation.
- Fastest timed lap selection excludes pit-out laps and incomplete durations but does not verify deleted-lap status or comparable tyre/fuel conditions.
- A higher peak speed does not prove reduced drag, a setup change, or time gained on a straight. Fuel, tyres, tow, track evolution and energy deployment are uncontrolled.
- FIA car presentation submissions describe intended changes. They do not establish which parts a driver used on a specific lap or the resulting performance effect.
- Upgrade documents are linked sources, not an automatically ingested or verified upgrade database. The dated US GP link is not relabelled for other events.
- Automatic updates currently occur on page open and every five minutes while open. No background scheduler or unattended ingestion is configured.

## Architecture

See [Architecture](docs/architecture.md), [Verification](docs/verification.md) and the retained [Sites runtime guide](docs/sites-runtime.md).

## Branding and distribution

APEX is an independent analysis application, not affiliated with Formula 1 or the FIA. Formula 1 display fonts were obtained from Formula 1's official website at the user's request. They and associated marks remain their owners' property; this repository does not grant redistribution rights. Review brand/font licensing before public distribution. No repository-wide open-source license is asserted for these third-party assets.

## GitHub and deployment

Repository: https://github.com/Shamnath16/H2H-apex-telemetry-v2.0

The GitHub repository is a source mirror. Keep the existing `.openai/hosting.json` project ID when updating this Site. Do not include `.env`, local runtime credentials, `.sites-runtime`, `.wrangler`, build output, or `node_modules` in commits. GitHub Actions runs a type check and production build; publication remains explicit through Sites.

