# APK adoption readiness — execution ledger v1.0
Status: draft / AD-01 baseline verified, remaining checks DEFERRED; AD-02 ready for owner command. Sequential owner-approved implementation.
Target: Global Chess Ultimate (React 19, TypeScript, chess.js 1.4.0, Three.js, Cloudflare Worker). Source: locally supplied Chess.apks, Unity 2022.3.62f2. PR #8 was open and unmerged when this branch was created from main; reconcile its merged changes before release and before any dependent integration that cannot safely proceed on the pinned baseline. Do not modify PR #8 or the older chess repo.
## Verified local reference evidence (not shipped here)
106 clip records across bundles (103 main): stream frames, coefficient words converted to floats, dense samples, constant values, bindings and events exported; 106 stream-index and dense-length checks passed. No animation rendered or fully bound to web components.
50 Spine atlas and 50 skeleton payloads; skeleton headers 4.2.29. 47 serialized skeleton assets link through atlas/material/texture references; 4 have exact atlas/image dimensions, 43 require UV/padding verification. Static reference linkage is not playback. 44 FSB5 Vorbis banks have valid declared bounds; zero playable conversions: installed FFmpeg lacks FSB5 support, dependency installation unavailable. 3,038 prefab RectTransform records; no nonempty serialized persistent callbacks found in decoded main prefab. Runtime listeners and capture code not recovered. 288 piece sprites / 11 board images previously extracted. Original authoring assets and rights unverified.
## Non-negotiable safeguards
Public repository: do not commit third-party APK payloads, assets, copied code, animation data, proprietary font/audio or remote services without documented distribution rights. Private reference packs remain local. License-cleared assets only; independently implement missing behavior; if no rights, use original or properly licensed alternatives and report non-exact visual parity. Spine runtime license also required. No paid dependency without approval. No engine/rules/backend/auth/protocol/save schema replacement; presentation adapters only. No production deploy or merge until explicit approval and all required gates pass. Existing 3D mode and fallback preserved. Never infer exact behavior from names. No blanket "100% complete" claims.
## Task sequence
Every ID starts PENDING unless specified. Only work on the user-authorized next ID. Update ledger with status, commit SHA, paths, commands, test output, evidence, blockers, and next ID after each task. PASS requires actual proof. Owner-approved progression policy (2026-11-25): always attempt scoped implementation and verification; if a check fails, errors, or is unavailable, record exact evidence and defer it to the final verification backlog. Finish all feasible work within the current ID, mark PASS, PARTIAL/DEFERRED or BLOCKED honestly, then present a one-click START AD-xx command for the immediately following ID. Do not start it automatically; wait for owner click. Do not jump over IDs. For a hard dependency, complete only safe independent portions, record blocked portions and do not pretend the prerequisite is satisfied. No mandatory release gate may be waived by deferral. Mark unavailable source details UNVERIFIED, never invent.
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
AD-00 PLANNING ONLY: static evidence examined locally, branch created. No implementation, build, playback, or live tests performed. First executable ID AD-01. Use `START AD-01`; subsequent owner progression policy below supersedes the original all-checks-pass-before-next-ID rule. 
## AD-01 execution record — 2026-11-25
**Status: BLOCKED — current baseline verified; PR #8 reconciliation not complete.** AD-02–AD-40 remain PENDING. No implementation, merge, or deployment authorized or performed.
- Pinned main: ad1a708e17d8e15220d37d39988ba6cee8ed304f. AD-01 starting head: b4d269bab68d52745ca5b7cf445e06b7e24d18b4. GitHub compare: 1 ahead, 0 behind; only this ledger added; no application/backend delta. PR #9 draft/open/mergeable at observation. Remote diff clean of app changes, not a locally checked git status.
- PR #9 workflow [45571518752](https://github.com/S2zxx0zxx/Global-Chess-Ultimate-PVP-/actions/runs/45571518752), job 139059051787: checkout synthetic merge 36fb69d0dc9afd1713cc566829eaa791a7d24f36 (head b4d269b + pinned main). npm ci and npm run verify PASS, 82 tests / 82 pass / 0 fail / 0 skipped; worker bundle, TypeScript and production build PASS (Vite 2.15s). All 12 named P01–P08 browser/benchmark/lifecycle/analysis/motion/packaging/audio steps PASS; nine artifact upload steps PASS. This is existing CI evidence, not a fresh local execution. No physical Android or hosted multiplayer verification claimed.
- Pinned source inspection: package.json (0269f32), .github/workflows/verify.yml (bcdd050), src/App.tsx (c9b2e9a), src/game.ts (da70c71), src/ChessBoard3D.tsx (0b76ba1), src/PrivateOnline.tsx (2bb0148), src/RoyalStudio.tsx (793040b), server/src/index.js (82ad820), src/gameplay-events.ts (e41da87), src/gameplay-feedback.ts (9f66c67), docs/FEATURE_MATRIX.md (51fe37f), docs/ORIGINALITY.md (312cbd8). Targeted source reads, not exhaustive recursive tree inspection. Repository version 0.2.0-beta.1; React 19.1.1, chess.js 1.4.0, Three.js 0.180.0, Node 22 CI.
- Protect existing contracts: App uses chess.js canonical state and drag/event adapters; gameplay-events.ts already exposes committed move, capture (including en passant square), castle rook movement, promotion, check, turn and match-end events, coordinate mapping and legal drop. gameplay-feedback.ts already has AudioPort/WebAudioPort, revision deduplication, bounded voices, unlock, volume/mute, haptic and reduced-motion controls. Reuse rather than duplicate. Preserve game.ts storage/result logic, PrivateOnline room/session protocol, server Durable Object/rules, Three.js renderer and RoyalStudio routing/settings. Feature matrix is historical; code and CI take precedence over stale descriptions.
- PR #8 open, draft, not merged; head d9785e9d20cfc4d12106b1f35d6a0f8dd91797f4, 6 ahead / 0 behind pinned main, 24 files changed, 791 additions / 38 deletions per PR metadata. Overlap: App.tsx, ChessBoard3D.tsx, PrivateOnline.tsx, RoyalStudio.tsx, game.ts, royal-sheets-v5.css, server/src/index.js, package.json and verify workflow. Added selection.mjs, chess-cosmetics.ts, openings.ts, voxel-models.ts and acquisition/verification scripts. No cherry-pick, merge, edit or rerun of PR #8.
- PR #8 latest observed [run 45550665712](https://github.com/S2zxx0zxx/Global-Chess-Ultimate-PVP-/actions/runs/45550665712), job 138990790829, checked out synthetic merge 1a13c65330a5f34d6833fedd56ddda24ab26141e: npm run verify PASS (87/87 tests), P01 browser PASS, five-resource browser step PASS; two-client selection browser step FAIL, exit 1. Exact assertion: `assert.ok(ready)`, scripts/five-selection-browser.mjs:28:122. The source polls http://127.0.0.1:4190 for an OK response 100 times with 200ms delay before launching Chromium. Failure precedes actual two-client interaction; root cause unproven, not evidence of a demonstrated protocol defect. P02–P08 skipped in that run. Log also shows ENOENT public/assets/five-resource/premium-low-fantasy.fbx during strict asset check; browser step still green, exact FBX acceptance unproven. No claim about count of other missing binaries from this log.
- Release/reconciliation blocker: PR #8 has not met its own gates (latest browser readiness failure, premium asset proof, hosted two-client verification). Wait for separately authorized PR #8 workflow to resolve and merge; re-fetch main and PR #9, reconcile without overwriting, inspect final tree/diff, run baseline verification on updated head and record evidence. Local full-tree checkout/git status and updated integrated CI still outstanding. At the time of this record, no permission to start AD-02 was given. Superseded for progression only by owner instruction below; release gates remain mandatory.

## Owner-approved progression policy and deferred verification register — 2026-11-25
- AD-01 historical BLOCKED status retained above; current disposition: PARTIAL / VERIFICATION DEFERRED. 8/10 acceptance checks met; baseline CI 82/82 passed. Not counted as fully verified.
- DEFER-01: full repository tree and local checkout/status inspection; evidence outstanding.
- DEFER-02: PR #8 reconciliation and integrated baseline tests; PR #8 remains separately managed. Known findings: readiness assertion failure, missing premium FBX evidence, hosted two-client verification outstanding.
- Continue AD-02 on the pinned, known-good baseline as an independent task; this policy update does not start AD-02 or change application code.
- At each task close, append failed/skipped checks, dependencies, exact error, retry command, and resolution evidence to this register. Review deferred checks during AD-33–AD-39 as appropriate, with all mandatory checks resolved before AD-40. No unauthorized asset distribution, unsafe changes, auto-merge or production deploy.
- Next user command: `START AD-02`. After its feasible work and verification attempt, offer `START AD-03`; repeat sequentially. No automatic start.

## Release gates
Rights/provenance; asset integrity; audio playback; Unity binding/animation parity; Spine runtime and UV correctness or approved fallback; board/input correctness; special moves; multiplayer and clocks; save recovery; PWA; performance/device; accessibility; CI/build; preview verification; explicit release authorization. A gate not applicable requires reason and user approval; failed mandatory gate blocks release.
