# Paid asset integration — execution checkpoint

Plan: GCU-ASSET-2026-11-v1.0. User authorized BUILD of P00 only; P01 requires an explicit passed P00 gate and subsequent user instruction. Single integration branch `feat/paid-asset-engine-integration` for P00–P09; no PR until final integration review; no merge to main until final gates. This supersedes the master plan's per-phase branch/PR scheme, not its requirements. Do not delete the existing V4 archive branch. No runtime changes in P00.

## P00 evidence

- Pinned main: [9469a533de86539260fd0483a187f31ffc16a515](https://github.com/S2zxx0zxx/Global-Chess-Ultimate-PVP-/commit/9469a533de86539260fd0483a187f31ffc16a515); compare returned identical, zero file delta. New integration branch created from this SHA. Repository is public.
- User-supplied package: Chess Game Template v1.1.1.unitypackage; SHA256 d79d87045aadd506c9ba5714a3699eadbb60004b1f2737190ba2344b28098f1c; 2,949,496 bytes. Internal ReadMe says version 1.1, unresolved version discrepancy. Publisher ID 19836 from ReadMe, not independently confirmed listing.
- Local-only master plan SHA256 af8e19f57ad529cf2f8525728ba4441319a55716e69c6b9e5b813bebe81530a9. Local-only GCU_P00_Private_Inventory.json SHA256 be2b8d8c27735336131beb9704d6b552e5f58c86e9a3f78ed36695e39c386952. Retain these original user-side files for subsequent sessions; recheck hashes before relying on them.
- Archive inspected without extracting into repo: 350 unique tar members (85 directories, 265 regular files); 85 pathname records, 77 nonempty payloads, 8 folder records. All 85 path/size/hash records and dispositions matched master plan. 70 asset.meta, 32 preview.png and one .icon.png tracked as archive auxiliary records; not adopted. No symlinks or nonregular member types. Pathname records contain a trailing newline and 00 marker, normalized before matching. 19 C# scripts / 4739 lines; 27 PNG, 5 MP3, 3 animation clips, 2 controllers, 2 scenes, 2 prefabs, 15 settings, one PDF and one ReadMe. No raw proprietary content is included in this commit.
- All 84 task IDs unique and their dependencies resolve to preceding IDs, checked locally with Python. Counts per phase: 6, 8, 8, 8, 8, 8, 8, 8, 12, 10. Full task descriptions, asset disposition and dependencies remain in the exact local master plan; this ledger records progress and safe restart position.

## Entitlement disposition — owner attestation recorded; distribution restricted

2026-11-25: the user explicitly states that the entire supplied package belongs to them and authorizes adoption and implementation of its contents in Global Chess Ultimate. Record this as the user's ownership/usage attestation, not as independently verified publisher terms, a receipt, or a third-party rights audit. Previously blocked T03 is accepted for engineering progression on that basis and with the existing restricted-media policy. No purchase-specific license, independent entitlement proof or third-party notices were supplied; do not falsely report these as verified. The original archive, proprietary source, documentation and raw media remain private and out of the public repository/public CI. Continue the full technical scope via independent implementations of general chess algorithms and compatible adapters. Preserve source-to-feature dispositions; do not silently drop P08 media tasks. Any direct distribution of paid code/media requires a separate release disposition at P08/P09; use private local inputs and independently authored fallbacks where necessary. The user's attestation is not a claim that an unrelated publisher waived applicable terms. No paid service enabled. This is a conditional engineering acceptance of T03, not legal certification. General references: https://unity.com/legal/as-terms and https://assetstore.unity.com/browse/eula-faq.

## Baseline — observed, not runtime certification

[Exact main CI](https://github.com/S2zxx0zxx/Global-Chess-Ultimate-PVP-/actions/runs/45460101240), job 138680031584: npm install, npm run verify, artifact upload all success; 16/16 tests, zero failures; worker bundle 93.1 kB; TypeScript and Vite build success. Vite build 2.67s. Tests cover opening, checkmate, castling, promotion, clocks, puzzles, 50-route registry, source-level interaction/visual checks, private room legality and revision rejection. Existing test named en passant only exercises promotion; add actual EP coverage in P01. Source checks are not screenshots or physical Android verification. Container direct Git clone blocked by DNS; no fresh local npm build or browser/device run claimed. No code changes made here.

Source anchors at pinned main:
- src/game.ts:27–44 existing one-ply computer heuristic; 45–47 result mapping; 6–11 existing storage keys.
- src/App.tsx:73–119 persistence, history, refresh and start; 150–221 canonical move and bot scheduling; 245–254 hints; 295 undo; 394–399 tap board, legal markers/capture effect.
- src/ReplayViewer.tsx:44 heuristic analysis, 50 autoplay. Keep separate request lifecycle from live AI.
- src/ChessBoard3D.tsx:115–149 raycast input and render lifecycle; preserve 2D/3D parity.
- src/PrivateOnline.tsx:26 turn authorization, 87 revision-bearing move command. No offline engine assistance in online rooms.
- src/RoyalStudio.tsx:139 mode entry, 150 data reset. Preserve 50-route registry, Royal V5 style, actual local stats and existing puzzle journeys.
- public/sw.js:1–18 runtime cache, optional art excluded. Version worker protocol and cache, preserve old saves.
- package.json and .github/workflows/verify.yml: existing npm verify = tests, Worker bundle, TS/Vite build; no new dependencies authorized in P00.

## P00 revalidation — 2026-11-25

- Reopened the exact master plan, archive and local inventory. All three file SHA-256 values above matched; freshly recomputed all 85 inventory payload entries against archive bytes (77 nonempty, 8 folder records), 350 archive members, and all 84 unique task IDs with preceding dependencies.
- Main remained identical to pinned baseline; integration branch before this sign-off was one documentation-only commit ahead, zero behind. [Checkpoint CI run 45464253543](https://github.com/S2zxx0zxx/Global-Chess-Ultimate-PVP-/actions/runs/45464253543) completed successfully for exact head ea41d9349a30c06817dec7eb0563d70816689aec. No runtime files differed from pinned main.
- Reviewed the six P00 task definitions in original plan lines 95–100 and G0: documented entitlement with restricted media blocked unless authorized. T04 source/CI baseline, T05 task and risk register and T06 architecture/performance protocol accepted as planning and baseline evidence only. No runtime worker, AI upgrade or benchmark is claimed implemented.
- Gate G0: accepted with owner attestation and restricted distribution policy. Independent commercial license verification and runtime/device acceptance are not asserted. P01 may start only on next explicit instruction. This changes the earlier blanket P00 hold into a scoped distribution hold; technical requirements and all 84 IDs are retained.

## Requirements / defects / decisions

All source mechanisms accounted for in master plan. Scope mapping: P01 rules/perft/FEN/undo; P02–04 independent search, evaluation, time limits, ordering, PV, position identity and bounded cache; P05 mode lifecycle; P06 replay and learning; P07 input/motion/events; P08 optional licensed media and transition concepts; P09 integration, distribution and release. Keep canonical chess.js, do not replace React/Three.js or add Unity runtime. Asset risks R01–R12 from plan are static observations/hypotheses, not runtime reproductions: R01 fixed time -> request budget; R02 synchronous search -> worker; R03 elapsed seconds -> monotonic deadline; R04 checked quiescence -> all evasions; R05 incomplete hash -> full position identity; R06 FEN counters -> canonical round trip; R07 coordinate bounds -> validated pointer; R08 undo indices -> canonical state; R09 terminal mislabel -> separate reasons; R10 unchecked callback -> commit-only events; R11 sound index -> verify actual mapping rather than assume array size; R12 perft overflow -> BigInt. Do not copy proprietary source. No new network services, payments, or ranked matchmaking in scope.

## P00 proposed contracts (design evidence, no implementation)

Worker message v1: request {protocol:1, searchId, gameId, revision, purpose:play|analysis, initialFen, moves:UCI[], limits:{timeMs,maxDepth,maxNodes}}. Validate bounded input lengths, legal replay and finite integer budgets; worker returns matching IDs, completedDepth, nodes, elapsedMs, score with perspective and mate/centipawn discriminator, legal UCI PV, status complete|timeout|cancelled|error|terminal, optional candidate. Worker is advisory only. Controller rejects stale IDs, mismatched position/revision, illegal candidate, expired clock, nonactive mode; cancel/terminate on restart, undo, pause, route exit, timeout or finish. Preserve game history/repetition by replaying canonical moves rather than only FEN. No live online hints. Use monotonic performance.now for search; existing wall-clock clock reconciliation for match. Worker hard-stop and fallback validated; never invent completed depth. Fallback existing bounded heuristic only, with visible degraded state.
 
Committed event envelope: {version:1, gameId, revision, eventId, kind, payload}; move committed, capture, check, promotion, turn change, match ended. Emit after successful canonical move, deduplicate per event ID, allow visual/audio consumers to fail independently. Keep pointer tap and keyboard access. Persist versioned JSON with additive fields and defensive read/validation; existing gcu.*.v1 and PGN remain readable; worker jobs transient, no raw assets in storage. Recovery revalidates state before starting another search. No new production API.

Performance protocol (provisional design targets, not measured): fixed seed and position corpus; start position perft 20/400/8902; independently verify Kiwipete FEN before reference counts; castling-through-check, pinned/en-passant discovery, four promotions, mate/stalemate/repetition/counters and undo state. Search benchmark fixed depth/node budget, paired old-vs-new tactical corpus, warm/cold runs, report p50/p95 over at least 30 runs per preset, actual completed depth, nodes, memory, timeout overshoot; no Elo assertion. Proposed starting budgets 100/300/750/1500ms with explicit max depth/nodes and remaining-clock clamp, tune on low-end hardware; check 1ms and long deadlines, no search-induced main-thread task >50ms; 30-minute bounded-cache run. Device matrix: 320/360/414/768 widths, portrait/landscape Chromium, physical Android low-end and current device if available; record model/OS/browser, frame/long-task metrics, offline warm reload, touch/mouse/keyboard, 2D/3D, undo/promotion/capture, replay, storage denial. Physical device and deployed runtime not verified. P01–P09 implement/test only after phase gate.

## Task ledger

| GCU-P00-T01 | VERIFIED | Package identity and version mismatch verified |
| GCU-P00-T02 | VERIFIED | All payload hashes and dispositions verified |
| GCU-P00-T03 | ACCEPTED_WITH_RESTRICTIONS | Owner attestation recorded; publisher terms not independently verified; distribution gate retained |
| GCU-P00-T04 | VERIFIED | Exact-main CI and source baseline rechecked; checkpoint CI passed |
| GCU-P00-T05 | VERIFIED | 84 task IDs/dependencies revalidated; 12 risks mapped; decisions recorded |
| GCU-P00-T06 | VERIFIED | Worker/event/storage and benchmark protocol reviewed against plan; implementation pending |
| GCU-P01-T01 | VERIFIED | Canonical chess.js retained; unchanged dependency, rules authority, storage and wire schema; CI parity passed |
| GCU-P01-T02 | VERIFIED | BigInt perft/divide; start d1–4 20/400/8902/197281; root snapshot unchanged |
| GCU-P01-T03 | VERIFIED | Kiwipete d1–3 48/2039/97862; castling-through-check, pins and rook rights tests passed |
| GCU-P01-T04 | VERIFIED | White/black en passant, expiry, discovered check rejection; 16 promotion cases incl captures and underpromotion passed |
| GCU-P01-T05 | VERIFIED | Mate, stalemate, insufficient material, threefold, fifty-move and counters; current automatic casual draw policy documented |
| GCU-P01-T06 | VERIFIED | Seeded legal walks, full undo, FEN/PGN and replay custom-start/repetition regression passed |
| GCU-P01-T07 | VERIFIED | Misnamed original test corrected, real EP test and server/local legal/terminal parity passed |
| GCU-P01-T08 | VERIFIED | 360 heuristic p50/p95 20.2/69.6 ms; 414 18.8/71.7 ms; 30 long tasks each; replay p50/p95 1.2/1.4 ms each; 180/180 selected tactical trials |
| GCU-P02-T01 | VERIFIED | Protocol v1 typed bounds, identity, legal one-ply PV, malformed request and response regression passed |
| GCU-P02-T02 | VERIFIED | One worker/job, exactly-once resolution, cancellation, late-callback rejection; browser real cancellation and silent-port hard-stop passed |
| GCU-P02-T03 | VERIFIED | Legal move history reconstruction, canonical FEN equality, repetition and counters; invalid history rejected |
| GCU-P02-T04 | VERIFIED | Independent centipawn material and terminal result separation; perspective fixtures passed |
| GCU-P02-T05 | VERIFIED | Original mirrored piece-square formulas and phase-aware king activity; symmetry and endgame fixtures passed |
| GCU-P02-T06 | VERIFIED | Isolated mobility/pawn/shelter terms, deterministic seeded one-ply result; evaluation p95 0.030 ms both viewports |
| GCU-P02-T07 | VERIFIED | Bounded legal fallback, deadline/node cap, no fabricated depth or score; silent-port hard-stop 142.3 ms both viewports |
| GCU-P02-T08 | VERIFIED | Opt-in evaluator, legacy strategy off-thread; live identity/history/legal checks; actual React saved computer match resume passed both viewports |
| GCU-P03-T01 | VERIFIED | Independent Negamax Alpha-Beta, exhaustive shallow minimax parity, signed mate-distance tests passed |
| GCU-P03-T02 | VERIFIED | History-aware draw/terminal scoring; threefold, fifty-move, insufficient material, stalemate, mate priority passed |
| GCU-P03-T03 | VERIFIED | Stable completed iteration retained under node/deadline interruption; early incomplete search has no fabricated score/depth |
| GCU-P03-T04 | VERIFIED | Bounded quiescence, all legal check evasions, capture/quiet promotions and recapture trap tested |
| GCU-P03-T05 | VERIFIED | 1ms and 2000ms engine budget tests; real browser 1ms round trip 19.6/21.7ms, 2000ms 2015.9/2017.1ms; node and recursion limits verified |
| GCU-P03-T06 | VERIFIED | Full legal PV replay, invalid tails/forged mate rejection and canonical live state validation passed |
| GCU-P03-T07 | VERIFIED | Seven-position tactical corpus with independent forced mate-in-two oracle, decisive capture promotion and quiet-promotion regression |
| GCU-P03-T08 | VERIFIED | Paired fixed seed/browser tests: foundation 30/42, advanced 42/42; 0 observed long tasks, measured latency/depth/node/timeout evidence recorded |
| GCU-P04-T01 | IMPLEMENTED_PENDING_VERIFY | Exact-head CI/profile/soak evidence pending |
| GCU-P04-T02 | IMPLEMENTED_PENDING_VERIFY | Exact-head CI/profile/soak evidence pending |
| GCU-P04-T03 | IMPLEMENTED_PENDING_VERIFY | Exact-head CI/profile/soak evidence pending |
| GCU-P04-T04 | IMPLEMENTED_PENDING_VERIFY | Exact-head CI/profile/soak evidence pending |
| GCU-P04-T05 | IMPLEMENTED_PENDING_VERIFY | Exact-head CI/profile/soak evidence pending |
| GCU-P04-T06 | IMPLEMENTED_PENDING_VERIFY | Exact-head CI/profile/soak evidence pending |
| GCU-P04-T07 | IMPLEMENTED_PENDING_VERIFY | Exact-head CI/profile/soak evidence pending |
| GCU-P04-T08 | IMPLEMENTED_PENDING_VERIFY | Exact-head CI/profile/soak evidence pending |
| GCU-P05-T01 | PLANNED | Not started; previous phase gate required |
| GCU-P05-T02 | PLANNED | Not started; previous phase gate required |
| GCU-P05-T03 | PLANNED | Not started; previous phase gate required |
| GCU-P05-T04 | PLANNED | Not started; previous phase gate required |
| GCU-P05-T05 | PLANNED | Not started; previous phase gate required |
| GCU-P05-T06 | PLANNED | Not started; previous phase gate required |
| GCU-P05-T07 | PLANNED | Not started; previous phase gate required |
| GCU-P05-T08 | PLANNED | Not started; previous phase gate required |
| GCU-P06-T01 | PLANNED | Not started; previous phase gate required |
| GCU-P06-T02 | PLANNED | Not started; previous phase gate required |
| GCU-P06-T03 | PLANNED | Not started; previous phase gate required |
| GCU-P06-T04 | PLANNED | Not started; previous phase gate required |
| GCU-P06-T05 | PLANNED | Not started; previous phase gate required |
| GCU-P06-T06 | PLANNED | Not started; previous phase gate required |
| GCU-P06-T07 | PLANNED | Not started; previous phase gate required |
| GCU-P06-T08 | PLANNED | Not started; previous phase gate required |
| GCU-P07-T01 | PLANNED | Not started; previous phase gate required |
| GCU-P07-T02 | PLANNED | Not started; previous phase gate required |
| GCU-P07-T03 | PLANNED | Not started; previous phase gate required |
| GCU-P07-T04 | PLANNED | Not started; previous phase gate required |
| GCU-P07-T05 | PLANNED | Not started; previous phase gate required |
| GCU-P07-T06 | PLANNED | Not started; previous phase gate required |
| GCU-P07-T07 | PLANNED | Not started; previous phase gate required |
| GCU-P07-T08 | PLANNED | Not started; previous phase gate required |
| GCU-P08-T01 | PLANNED | Not started; previous phase gate required |
| GCU-P08-T02 | PLANNED | Not started; previous phase gate required |
| GCU-P08-T03 | PLANNED | Not started; previous phase gate required |
| GCU-P08-T04 | PLANNED | Not started; previous phase gate required |
| GCU-P08-T05 | PLANNED | Not started; previous phase gate required |
| GCU-P08-T06 | PLANNED | Not started; previous phase gate required |
| GCU-P08-T07 | PLANNED | Not started; previous phase gate required |
| GCU-P08-T08 | PLANNED | Not started; previous phase gate required |
| GCU-P08-T09 | PLANNED | Not started; previous phase gate required |
| GCU-P08-T10 | PLANNED | Not started; previous phase gate required |
| GCU-P08-T11 | PLANNED | Not started; previous phase gate required |
| GCU-P08-T12 | PLANNED | Not started; previous phase gate required |
| GCU-P09-T01 | PLANNED | Not started; previous phase gate required |
| GCU-P09-T02 | PLANNED | Not started; previous phase gate required |
| GCU-P09-T03 | PLANNED | Not started; previous phase gate required |
| GCU-P09-T04 | PLANNED | Not started; previous phase gate required |
| GCU-P09-T05 | PLANNED | Not started; previous phase gate required |
| GCU-P09-T06 | PLANNED | Not started; previous phase gate required |
| GCU-P09-T07 | PLANNED | Not started; previous phase gate required |
| GCU-P09-T08 | PLANNED | Not started; previous phase gate required |
| GCU-P09-T09 | PLANNED | Not started; previous phase gate required |
| GCU-P09-T10 | PLANNED | Not started; previous phase gate required |

## Resume rule

P00 engineering gate accepted: five verified tasks and one accepted with restrictions, six dispositions complete. P01 complete; G1 PASS on verified implementation head 31befb030931973f63299367d3e8c92147d1ab0f. P02 completed; resume rule and measured evidence updated in P02 checkpoint below. P02 verified; resume GCU-P03-T01 through T08 only on explicit user instruction on the same integration branch; re-fetch exact main and branch head before edits. P01 and P02 evidence are the comparison baselines. Never treat the ownership attestation as independent publisher/license verification or permission to redistribute raw assets in public. Revisit distribution at P08/P09. No PR created, no main merge, no raw package committed. Record actual tests and exact commits at each phase, with no fabricated results. Final PR only after P09.

## P01 execution checkpoint — G1 PASS

- User authorized P01 only. Original plan/archive/private inventory SHA-256 matched P00. Main stayed pinned to 9469a533de86539260fd0483a187f31ffc16a515. No raw paid assets in public branch. Perft/Board/FEN mechanisms referenced only; independent BigInt public-API implementation.
- Implementation commit [8613348411f3acce1f8f8483a1d1e9c4cc172092](https://github.com/S2zxx0zxx/Global-Chess-Ultimate-PVP-/commit/8613348411f3acce1f8f8483a1d1e9c4cc172092): 27/27 tests, worker and build succeeded; browser step failed in run [45493411978](https://github.com/S2zxx0zxx/Global-Chess-Ultimate-PVP-/actions/runs/45493411978) because ubuntu-latest had moved to Ubuntu 26.04, incompatible with Playwright 1.56.1. No test was disabled or bypassed.
- Corrected runner commit [31befb030931973f63299367d3e8c92147d1ab0f](https://github.com/S2zxx0zxx/Global-Chess-Ultimate-PVP-/commit/31befb030931973f63299367d3e8c92147d1ab0f) pins ubuntu-24.04. [Run 45493547072](https://github.com/S2zxx0zxx/Global-Chess-Ultimate-PVP-/actions/runs/45493547072), job 138797917389, completed SUCCESS. Exact-head npm verify: 27 tests, 27 pass, 0 fail; Worker bundle 93.1 kB; TypeScript/Vite build success (Vite 1.98s). Existing large Three.js chunk warning remains; not a P01 failure. Browser setup, baseline and both artifact uploads succeeded.
- Test anchors: tests/helpers/perft.mjs, tests/p01-correctness.test.mjs, tests/chess.test.mjs; src/chess-state.ts and src/ReplayViewer.tsx fix nonstandard FEN replay and preserve prefix history. src/game.ts, storage keys, server/src/rules.mjs and dependency versions unchanged. P01 document: docs/P01_CORRECTNESS_BASELINE.md.
- Measured headless Chromium 141.0.7390.37 / Linux, 360x800 and 414x896 simulated touch/mobile viewports. Fixed six-position corpus, 30 rounds each = 180 heuristic calls and 30 replay reconstructions per viewport; 360 legal/nonmutating calls overall, 60 replay reconstructions, 180/180 selected tactical trials (three distinct simple tactical positions repeated; not broad strength or Elo). Artifact [14968226062](https://github.com/S2zxx0zxx/Global-Chess-Ultimate-PVP-/actions/runs/45493547072/artifacts/14968226062); production preview artifact [14967008918](https://github.com/S2zxx0zxx/Global-Chess-Ultimate-PVP-/actions/runs/45493547072/artifacts/14967008918).

| Viewport | Existing heuristic p50 / p95 / max (ms) | Replay rebuild p50 / p95 / max (ms) | Observed long tasks / max (ms) |
|---|---|---|---|
| 360x800 | 20.2 / 69.6 / 71.9 | 1.2 / 1.4 / 2.9 | 30 / 76 |
| 414x896 | 18.8 / 71.7 / 75.8 | 1.2 / 1.4 / 2.8 | 30 / 80 |

Long tasks are observed during the benchmark interval (includes harness work), not exclusively attributed to the engine. Existing synchronous heuristic exceeds the provisional 50 ms main-thread target. This is baseline evidence motivating P02 worker isolation and later G7 performance remediation, not a G7 pass. No physical Android, full browser UI journey, hosted-runtime or production-release certification claimed. T08 requires recording a baseline, not yet meeting future performance targets.

G1 PASS: all eight task deliverables implemented, exact-head CI and baseline verified, root state and live history unchanged after search, no known correctness regression in tested scope, no raw asset disclosure. 14/84 task dispositions closed (P00 includes owner attestation accepted with restrictions). P02 is PLANNED, not started. Main remains untouched; final consolidated PR and merge only after P09. This ledger-only follow-up commit records evidence from the exact tested implementation head; its own CI must be checked before subsequent code changes.

## P02 execution checkpoint — phase gate PASS

- User authorized P02 only. Original archive, master plan and private inventory hashes matched. P01 ledger CI [45493816235](https://github.com/S2zxx0zxx/Global-Chess-Ultimate-PVP-/actions/runs/45493816235) succeeded. Main remains 9469a533de86539260fd0483a187f31ffc16a515. Single integration branch, no PR/merge, no proprietary code/media uploaded. Re-inspected AI.cs, Engine.cs and Evaluation.cs; independent formulas and lifecycle adaptation only.
- Exact implementation head [acee17e1d50281b97d85a2cbf2b4b46aea3d8acc](https://github.com/S2zxx0zxx/Global-Chess-Ultimate-PVP-/commit/acee17e1d50281b97d85a2cbf2b4b46aea3d8acc), [CI run 45494899170](https://github.com/S2zxx0zxx/Global-Chess-Ultimate-PVP-/actions/runs/45494899170), job 138802665959, completed SUCCESS: 35/35 tests (8 new P02 tests, all P01 tests retained), zero failed; TypeScript/Vite build 2.89s; dedicated AI worker JS 43.81 kB uncompressed, server worker 93.1 kB; P01 rerun and P02 browser steps and all artifact uploads succeeded. No disabled gates.
- Source: src/ai/protocol.ts, evaluation.ts, search.ts, engine.worker.ts, client.ts; App and ReplayViewer call advisory worker, never directly commit worker results. Existing chess.js, room rules, saved-game schema, Royal V5 styles and routes unchanged. Default legacy strategy runs off-thread; VITE_AI_WORKER_FOUNDATION=true selects original one-ply positional evaluator. No recursive search or P03 work.
- Tests: tests/p02-worker.test.mjs maps T01–T08; scripts/p02-worker-baseline.mjs measures actual module workers, live state rejection, cancellation, legacy compatibility and simulated mobile React saved-match resume; docs/P02_AI_WORKER_FOUNDATION.md documents architecture and limits.

### Actual browser measurements

Headless Chromium 141.0.7390.37 / Linux, simulated mobile viewports. Six P01 positions x 10 rounds per viewport; 120 total successful one-ply results, all legal and root state unchanged; 60/60 selected tactical trials (three simple positions repeated across viewports). Both viewports passed real worker cancellation and stale-result rejection, legacy worker and React saved computer match resume. Max 48 root candidates evaluated.

| Viewport | Round trip p50 / p95 / max (ms) | Worker elapsed p50 / p95 / max (ms) | Evaluation p95 (ms) | Observed long tasks |
|---|---|---|---|---|
| 360x800 | 38.2 / 60.5 / 71.0 | 16.3 / 36.3 / 45.7 | 0.030 | 0 |
| 414x896 | 41.7 / 82.7 / 179.6 | 16.3 / 38.3 / 41.6 | 0.030 | 0 |

Silent-port timeout test: 20 ms requested + 120 ms grace, 142.3 ms observed each, terminated once, legal fallback and no fabricated depth/score. This is a controller scheduling test using an injected silent port, not a physical-device or busy-worker timing test. Compare P01 observed long tasks 60 over 360 baseline heuristic calls; P02 observed 0 over 120 foundation worker calls. Different sample counts and algorithms; not a controlled speedup or Elo claim. Round-trip includes fresh worker startup; slower elapsed round trip may coexist with improved responsiveness. No heap profiling, actual physical device, deployed runtime, offline worker-cache acceptance or full restart/undo/pause/navigation browser matrix claimed here. Those cross-phase requirements remain for later G2/G3/G6/G7/P09.

Artifacts: [P02 measured report 14967932737](https://github.com/S2zxx0zxx/Global-Chess-Ultimate-PVP-/actions/runs/45494899170/artifacts/14967932737), [P01 rerun 14968431648](https://github.com/S2zxx0zxx/Global-Chess-Ultimate-PVP-/actions/runs/45494899170/artifacts/14968431648), [production preview 14968770272](https://github.com/S2zxx0zxx/Global-Chess-Ultimate-PVP-/actions/runs/45494899170/artifacts/14968770272).

P02 phase acceptance PASS: eight task deliverables implemented and verified within the one-ply worker foundation scope. Master acceptance matrix G2 full advanced search parity/deadline/memory/tactical improvement is NOT complete; P03/P04 must independently verify it. 22/84 task dispositions closed, including P00 ownership attestation accepted with restrictions. P03 PLANNED, not started; resume GCU-P03-T01 only on explicit user instruction, after verifying latest branch/main and ledger-only CI. Final consolidated PR remains deferred until P09. No merge to main.

## P03 execution checkpoint — phase gate PASS

- User authorized P03 only. Original package SHA-256 d79d87045aadd506c9ba5714a3699eadbb60004b1f2737190ba2344b28098f1c, plan af8e19f57ad529cf2f8525728ba4441319a55716e69c6b9e5b813bebe81530a9, private inventory be2b8d8c27735336131beb9704d6b552e5f58c86e9a3f78ed36695e39c386952 all matched. Prior P02 ledger CI [45495194850](https://github.com/S2zxx0zxx/Global-Chess-Ultimate-PVP-/actions/runs/45495194850) succeeded. Main pinned to 9469a533de86539260fd0483a187f31ffc16a515. No PR or merge. No raw paid package, media or source copied. AI.cs mechanism reviewed (lines 36–60, 104–243, 248–313, 342); independent TypeScript implementation.
- Implementation 7f82c4c1c8d8d12e435e64c1959bf039eba25f93 had Node strip-only parameter-property syntax failure [45496219812](https://github.com/S2zxx0zxx/Global-Chess-Ultimate-PVP-/actions/runs/45496219812); corrected in c783044245c9c7444911cc237415c96cc6df0fb3. Second run [45496250597](https://github.com/S2zxx0zxx/Global-Chess-Ultimate-PVP-/actions/runs/45496250597) had 42/43 tests pass: ambiguous quiet promotion root expected immediate promotion despite a legal delayed promotion PV. Corrected to decisive capture-promotion fixture and separately retained quiet promotion frontier test. No test disabled.
- Verified exact implementation head [fcc7daf395edc90d7f5d7ab8775c7d2a41dfcb30](https://github.com/S2zxx0zxx/Global-Chess-Ultimate-PVP-/commit/fcc7daf395edc90d7f5d7ab8775c7d2a41dfcb30), [run 45496467113](https://github.com/S2zxx0zxx/Global-Chess-Ultimate-PVP-/actions/runs/45496467113), job 138808192573, completed SUCCESS. 43/43 tests (8 new P03 tests), zero failures; all P01/P02 browser regressions and paired P03 browser benchmark passed. TypeScript/Vite production build 2.06s; AI worker bundle 46.69 kB uncompressed; Cloudflare server worker unchanged 93.1 kB. All four artifacts uploaded.
- Source: src/ai/advanced.ts; src/ai/protocol.ts, client.ts, search.ts; tests/p03-search.test.mjs; scripts/p03-tactical-corpus.mjs and p03-advanced-benchmark.mjs. See docs/P03_ADVANCED_SEARCH.md. Original legacy/foundation strategy compatibility preserved. Advanced opt-in VITE_AI_ADVANCED_SEARCH=true; default legacy until later rollout. P04 capture ordering, killers/history, hashes/TT not implemented. No new runtime dependency. Current search limits: depth 6, quiescence extension 8, nodes 50,000, time 2,000 ms, worker grace 120 ms. No unbounded table; bounded depth, node counts and PV (14 plies); heap profiling and 30-minute repeated search remain P04/P09. Checked frontier cap aborts iteration instead of stand-pat; nonchecked frontier can statically evaluate at cap. Existing game policy auto-draw at threefold/fifty moves remains unchanged, not full FIDE claim UI.

### Verified paired browser report

Chromium 141.0.7390.37 / Linux, simulated mobile viewports 360x800 and 414x896, same seven fixed tactical positions, seed 7, 1500 ms budget, three repetitions each. Foundation depth 1 vs advanced max depth 3. Each strategy 42 trials overall, seven distinct positions. Root FEN/history unchanged, all accepted moves/PVs legal; saved React computer match resumed on both viewports.

| Viewport | Foundation correct / total | Advanced correct / total | Foundation wall p50 / p95 (ms) | Advanced wall p50 / p95 (ms) | Advanced worker p50 / p95 (ms) |
|---|---|---|---|---|---|
| 360x800 | 15/21 | 21/21 | 25.4 / 34.6 | 537.2 / 1516.1 | 522.4 / 1502.1 |
| 414x896 | 15/21 | 21/21 | 25.6 / 32.2 | 552.1 / 1515.6 | 536.5 / 1501.9 |

Totals 30/42 (71.43%) vs 42/42 (100%); +12 correct, +28.57 percentage points. Foundation missed mate-two and recapture trap in every repetition; advanced solved both and retained other five cases. Advanced 24 complete, 18 budget-timeout results with stable completed depth >=1; depth 1/2/3 counts 6/18/18; max observed nodes 1641 (paired trials). Zero observed main-thread long tasks in paired interval both viewports. 1 ms budget produced timeout in 19.6 / 21.7 ms round-trip (startup included), no fake depth/score; 2000 ms budget produced legal stable timeout at 2015.9 / 2017.1 ms wall, depth 3, nodes 2476 / 2427. These are observed benchmark timings, not guarantees or physical-device measurements. Advanced is slower than the one-ply foundation; P04 optimization is important. No Elo claim, no broad strength certification; seven positions, repeated. No heap measurement yet, no full lifecycle, offline or release certification.

Artifacts: [P03 report 14968079088](https://github.com/S2zxx0zxx/Global-Chess-Ultimate-PVP-/actions/runs/45496467113/artifacts/14968079088), [P02 rerun 14968951894](https://github.com/S2zxx0zxx/Global-Chess-Ultimate-PVP-/actions/runs/45496467113/artifacts/14968951894), [P01 rerun 14967989192](https://github.com/S2zxx0zxx/Global-Chess-Ultimate-PVP-/actions/runs/45496467113/artifacts/14967989192), [production preview 14968632277](https://github.com/S2zxx0zxx/Global-Chess-Ultimate-PVP-/actions/runs/45496467113/artifacts/14968632277).

P03 phase acceptance PASS: eight deliverables verified, legal PV, deterministic fixed-depth parity, bounded search and measured tactical improvement. Full cross-phase memory/device/long-duration validation remains P04/P09, not waived. 30/84 task dispositions closed (P00 T03 ownership attestation accepted with restrictions; independent publisher/distribution verification outstanding). P04 PLANNED, NOT STARTED; resume GCU-P04-T01 only on explicit user instruction after checking latest branch/main and ledger-only CI. Final consolidated PR after P09; no main merge.

## P04 execution checkpoint — GATE OPEN / verification in progress

- P04 authorized. Reopened exact master plan, package and private inventory; SHA-256 matched P00. P03 ledger CI [45496984100](https://github.com/S2zxx0zxx/Global-Chess-Ultimate-PVP-/actions/runs/45496984100) passed. Main unchanged at 9469a533de86539260fd0483a187f31ffc16a515. Inspected MvvLva.cs 22–37, AI.cs 87–97/138/176–186, Zobrist.cs 18–70, PVTable.cs 1–18, Magics.cs 137–177. Independent TS mechanisms only; raw paid content remains private.
- Implementation [f388224cec9da880d494574470c185baa13a8096](https://github.com/S2zxx0zxx/Global-Chess-Ultimate-PVP-/commit/f388224cec9da880d494574470c185baa13a8096): initial [core run 45498526396](https://github.com/S2zxx0zxx/Global-Chess-Ultimate-PVP-/actions/runs/45498526396) npm verify step succeeded. First [memory soak 45498526591](https://github.com/S2zxx0zxx/Global-Chess-Ultimate-PVP-/actions/runs/45498526591) failed early: optimized timeout response lacked diagnostics; artifact absent. No completed 30-minute measurement.
- Corrected implementation [11d71298256f9c331f4dc3f58eea91c360d6133b](https://github.com/S2zxx0zxx/Global-Chess-Ultimate-PVP-/commit/11d71298256f9c331f4dc3f58eea91c360d6133b) supplies diagnostics on interrupted, terminal and error responses as well as complete. Fresh [full CI 45498660141](https://github.com/S2zxx0zxx/Global-Chess-Ultimate-PVP-/actions/runs/45498660141), job 138815770598, and [30-minute soak 45498659864](https://github.com/S2zxx0zxx/Global-Chess-Ultimate-PVP-/actions/runs/45498659864), job 138815770159, both in progress at last observation. Soak search step running. Do not treat either as passed before reading exact-head final logs and artifacts.
- All eight P04 deliverables implemented in src/ai/ordering.ts, transposition.ts, advanced.ts, protocol.ts, client.ts, search.ts, tests/p04-optimization.test.mjs and scripts/p04-*.mjs. Documentation docs/P04_SEARCH_OPTIMIZATION.md. New optimized strategy uses VITE_AI_OPTIMIZED_SEARCH=true; default legacy remains unchanged. Root tie order deliberately preserved; PV hints at nonroot only, legal moves exclusively from chess.js. 1024 cache entries, 8192 Int16 history slots, saturation 16384 and two killers/ply, job-local identity/history. Same-depth cache reuse, full identity collision check, mate normalization, exact/lower/upper bounds. No raw asset, new runtime dependencies, UI or online changes.
- Bitboard profile compares identical geometric array/BigInt ray primitives and separately measures canonical legal generation; no verified full WASM generator candidate, no rewrite. Asset dense magic allocation calculation 4 MiB before overhead. Actual measured profile still pending.
- T08 requires full 30 minutes of real elapsed time. CI script records one-minute post-GC heap/RSS samples, validates each search and caps, and asserts full duration and defined retained heap limits. No accelerated substitute. Node soak is not physical Android/worker lifecycle memory certification; browser comparison is simulated mobile. Physical-device and release evidence remain P09. Container git clone unavailable (DNS failure); GitHub CI is verification source.
- All P04 task rows remain IMPLEMENTED_PENDING_VERIFY until exact implementation evidence is read. 30/84 prior task dispositions closed. P05 remains PLANNED and NOT STARTED. No PR or main merge. Resume by fetching both runs for exact corrected implementation head, inspect full CI and profile plus soak artifact (elapsed >=1800000ms, post-GC growth/peak/caps), correct any failures, then update each row and gate only if all pass. Ledger-only commits do not count as runtime changes; compare before reusing evidence.
