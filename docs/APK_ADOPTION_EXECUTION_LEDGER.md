# APK adoption readiness — execution ledger v1.0
Status: draft / planning only. Sequential owner-approved implementation.
Target: Global Chess Ultimate (React 19, TypeScript, chess.js 1.4.0, Three.js, Cloudflare Worker). Source: locally supplied Chess.apks, Unity 2022.3.62f2. PR #8 was open and unmerged when this branch was created from main; reconcile its merged changes before implementation. Do not modify PR #8 or the older chess repo.
## Verified local reference evidence (not shipped here)
106 clip records across bundles (103 main): stream frames, coefficient words converted to floats, dense samples, constant values, bindings and events exported; 106 stream-index and dense-length checks passed. No animation rendered or fully bound to web components.
50 Spine atlas and 50 skeleton payloads; skeleton headers 4.2.29. 47 serialized skeleton assets link through atlas/material/texture references; 4 have exact atlas/image dimensions, 43 require UV/padding verification. Static reference linkage is not playback. 44 FSB5 Vorbis banks have valid declared bounds; zero playable conversions: installed FFmpeg lacks FSB5 support, dependency installation unavailable. 3,038 prefab RectTransform records; no nonempty serialized persistent callbacks found in decoded main prefab. Runtime listeners and capture code not recovered. 288 piece sprites / 11 board images previously extracted. Original authoring assets and rights unverified.
## Non-negotiable safeguards
Public repository: do not commit third-party APK payloads, assets, copied code, animation data, proprietary font/audio or remote services without documented distribution rights. Private reference packs remain local. License-cleared assets only; independently implement missing behavior; if no rights, use original or properly licensed alternatives and report non-exact visual parity. Spine runtime license also required. No paid dependency without approval. No engine/rules/backend/auth/protocol/save schema replacement; presentation adapters only. No production deploy or merge until explicit approval and all required gates pass. Existing 3D mode and fallback preserved. Never infer exact behavior from names. No blanket "100% complete" claims.
## Task sequence
Every ID starts PENDING unless specified. Only work on the user-authorized next ID. Update ledger with status, commit SHA, paths, commands, test output, evidence, blockers, and next ID after each task. PASS requires actual proof; BLOCKED stops dependent tasks (independent task only with user approval). Mark unavailable source details UNVERIFIED, never invent.
| ID | Task | Acceptance evidence |
|---|---|---|
| AD-01 | Lock baseline, reconcile PR #8 and inspect tree | pinned main SHA, diff, clean status, baseline verify results |
| AD-02 | Establish rights/provenance and asset quarantine | per-asset license/owner/hash/ship decision; no unapproved assets in public tree |
| AD-03 | Source manifest and asset dependency map | file hashes, paths, duplicates, exact dimensions, unresolved ledger |
| AD-04 | Audio decoding toolchain | pinned licensed FSB5 Vorbis decoder, setup IDs verified, no fallback fabricated audio |
| AD-05 | Convert and validate all audio | 44 results or explicit blockers; OGG/WAV, duration/channel/rate checks, listen QA |
| AD-06 | Unity animation curve normalization | 106 source IDs, stream/dense/constant/event records validated; bind map with unresolved IDs |
| AD-07 | Animation property binding and interpolation | resolve path hashes/property types; evaluate against reference, document unresolved targets |
| AD-08 | Spine skeleton/atlas mapping | 50 payloads each, 47 reference graphs, handle duplicates and unmapped payloads |
| AD-09 | Spine texture/UV and runtime/license | resolve 43 dimension discrepancies, correct alpha/blend, license and 4.2 compatible renderer |
| AD-10 | Spine playback verification | per-effect animation names, duration, screenshot/video parity, fallback; unresolved documented |
| AD-11 | UI hierarchy and component mapping | 3,038 layouts, screen/component mapping, anchors/pivots/safe areas, no invented callbacks |
| AD-12 | Interaction contract inventory | buttons, focus/keyboard/touch, modal layering, transition state, handler mapping |
| AD-13 | Asset catalog and theme loader | manifest, lazy-load/cache/fallback, source or licensed alternative, no raw APK shipping |
| AD-14 | Board renderer and coordinate adapter | square mapping all 64 cells in both orientations; responsive layout, hit targets |
| AD-15 | Piece rendering and shadows | all six types both colors, pivots/trims/shadows, theme switch, no clipping |
| AD-16 | Legal move indicators | legal-only targets, selection, last move/check, arrows, keyboard accessible |
| AD-17 | Move presentation state machine | authoritative committed move only, cancellation/reduced motion, rapid input |
| AD-18 | Capture effect adapter | single effect per accepted move, en passant captured square, no state mutation |
| AD-19 | Special move presentation | castling both pieces, promotion choice, check/mate/draw, undo/resume |
| AD-20 | Audio event adapter | one event per committed transition, mute/volume/user gesture, browser decode |
| AD-21 | UI animation adapter | validated source-derived timings where permitted, explicit new behavior otherwise |
| AD-22 | Spine effects adapter | lazy mount, cleanup, fallback, GPU/memory measurement |
| AD-23 | Lobby and navigation | all mapped routes, real controls, no dead buttons |
| AD-24 | Match setup and mode selection | local, bot, existing online paths; no protocol changes |
| AD-25 | Gameplay HUD | player info, clock, move log, controls; authority unchanged |
| AD-26 | Promotion, pause, settings and overlays | modal ordering, keyboard/back, focus, touch, no input leaks |
| AD-27 | Game result and review | correct result, rematch, history and review, no fake analysis |
| AD-28 | Theme selection and profile | actual state persistence, accessible controls, no fake purchase |
| AD-29 | Tutorials and puzzles | own/cleared content; validate legal FEN and solutions |
| AD-30 | Missions/ranks/rewards scope | only supported features, no synthetic rankings or economies; defer backend-dependent additions |
| AD-31 | Responsive/accessibility | 320/360/390/768/desktop, safe area, reduced motion, keyboard |
| AD-32 | Offline/PWA asset strategy | offline cold/warm start, cache update/rollback, quota/fallback |
| AD-33 | Engine regression | existing tests + legal move/castling/en passant/promotion/checkmate/draw vectors |
| AD-34 | Multiplayer regression | reconnect, duplicate/out-of-order, stale moves, clock/auth checks, 2-client test |
| AD-35 | Save/recovery and bot regression | old saves resume, undo, bot cancellation, no lost data |
| AD-36 | Performance budgets | baseline vs new p95 frame/latency, memory, bundle size, low-end real-device evidence |
| AD-37 | Visual parity audit | actual reference screenshots if available, target screenshots, differences and rights |
| AD-38 | CI and security/release checks | npm run verify, strict asset validation, license/secret scan, preview and device QA |
| AD-39 | Final acceptance and rollback | all gates, residual risks, reproducible artifacts, rollback, user review |
| AD-40 | Merge and release | only explicit approval and verified green gates; no automatic merge |
## Ledger entry
AD-00 PLANNING ONLY: static evidence examined locally, branch created. No implementation, build, playback, or live tests performed. First executable ID AD-01. Use `START AD-01`; then `START AD-02` only after AD-01 passes. 
## Release gates
Rights/provenance; asset integrity; audio playback; Unity binding/animation parity; Spine runtime and UV correctness or approved fallback; board/input correctness; special moves; multiplayer and clocks; save recovery; PWA; performance/device; accessibility; CI/build; preview verification; explicit release authorization. A gate not applicable requires reason and user approval; failed mandatory gate blocks release.
