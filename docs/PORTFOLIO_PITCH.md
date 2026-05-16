# Agentic 3D Asset Studio - Portfolio Pitch

## One-Liner

Agentic 3D Asset Studio is a local-first AI workflow platform for 3D asset generation with FastAPI, React, provider abstraction, GLB preview, metadata, quality reports, quality gates, run replay, observability and agent-ready API endpoints.

## Problem

Many AI generation demos stop at a single output. For a real workflow, that is not enough.

Teams need to know:

- what provider generated the asset
- what input and settings were used
- whether the output passed quality checks
- whether a human reviewed it
- how to reproduce or replay the run
- what files are included in the delivery package
- what limitations should be reported to downstream users or agents

## Solution

I built a product-style workflow layer around image-to-3D generation.

The current version uses a deterministic local demo provider, but the system is structured so real providers such as TRELLIS, TripoSR, Stable Fast 3D, InstantMesh or private inference endpoints can be integrated later.

## Architecture

```text
React Product UI
  -> FastAPI Backend
  -> Provider Interface
  -> Local Demo Provider / Future Real Providers
  -> Local Asset Storage
  -> GLB + Metadata + Quality Report + Manifest + ZIP Package
  -> Quality Gates + Replay + Review + Observability + Agent API
```

## Main Features

- premium React product cockpit
- FastAPI backend
- deterministic local GLB provider
- real browser GLB preview with `model-viewer`
- provider abstraction
- generated asset history
- metadata export
- rule-based quality report
- production readiness checklist
- quality gates
- human review status and notes
- regeneration from feedback
- run replay from saved metadata
- observability dashboard
- storage inspector
- manifest and checksum-style delivery metadata
- ZIP asset package
- agent-readable instructions
- API endpoints for tool and agent use

## Why It Is Agent-Ready

The system returns structured outputs instead of only a visual result:

- `asset.glb`
- `metadata.json`
- `quality_report.json`
- `activity_log.json`
- `manifest.json`
- `package.zip`

Agents are instructed to report provider limitations, inspect quality outputs and avoid claiming production readiness without human review.

## What Is Real

- FastAPI backend
- React UI
- local deterministic GLB generation
- real generated files
- real metadata and quality report files
- real package ZIP creation
- real asset history
- real API endpoints
- real run replay flow
- real quality gate evaluation layer

## What Is Demo

- `local_demo` is not a real image-to-3D foundation model
- quality scoring is rule-based
- generated meshes are deterministic demo outputs
- production/game readiness requires human review

## Interview Pitch

I built Agentic 3D Asset Studio to show the workflow and platform layer around AI generation. The interesting part was not only generating a file, but making the workflow controllable: provider abstraction, metadata, quality reports, replay, review, quality gates, observability, storage inspection and agent-readable outputs.

The current provider is intentionally a local deterministic demo provider. I did not want to pretend it is TRELLIS or another real model. Instead, I designed the architecture so a real provider can be plugged in behind the same interface later.

## LinkedIn Post

I built Agentic 3D Asset Studio - a local-first AI workflow platform for 3D asset generation.

The project started as a simple image-to-GLB workflow, but I expanded it into a more complete AI application layer:

- FastAPI backend with agent-ready endpoints
- React product UI with real GLB preview
- provider abstraction for future image-to-3D backends
- metadata, quality reports, activity logs and manifest generation
- ZIP asset packages
- quality gates and production readiness checks
- human review status and review notes
- regeneration from feedback
- run replay from saved metadata
- observability dashboard and storage inspection

The current provider is a deterministic local demo provider, not a foundation image-to-3D model. The architecture is designed so real providers such as TRELLIS, TripoSR, Stable Fast 3D or InstantMesh can be integrated later.

For me, the interesting part was not just "generate a 3D file".

It was designing the workflow layer around an AI system: control, review, reproducibility, observability and agent/API access.

GitHub:
`https://github.com/danieloza/agentic-3d-asset-studio`

## GitHub Featured Description

```text
Local-first AI workflow platform for 3D asset generation with FastAPI, React, GLB preview, provider abstraction, metadata, quality reports, quality gates, run replay, observability, storage inspection and agent-ready API endpoints.
```

## Hashtags

```text
#AIEngineering #Python #FastAPI #React #AgenticAI #GenAI #AIWorkflows #MLOps #ThreeJS
```
