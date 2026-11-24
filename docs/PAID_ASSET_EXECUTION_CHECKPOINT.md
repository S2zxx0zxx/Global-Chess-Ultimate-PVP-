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
| GCU-P02-T01 | IMPLEMENTED_PENDING_VERIFY | Exact-head P02 unit/build/browser verification pending |
| GCU-P02-T02 | IMPLEMENTED_PENDING_VERIFY | Exact-head P02 unit/build/browser verification pending |
| GCU-P02-T03 | IMPLEMENTED_PENDING_VERIFY | Exact-head P02 unit/build/browser verification pending |
| GCU-P02-T04 | IMPLEMENTED_PENDING_VERIFY | Exact-head P02 unit/build/browser verification pending |
| GCU-P02-T05 | IMPLEMENTED_PENDING_VERIFY | Exact-head P02 unit/build/browser verification pending |
| GCU-P02-T06 | IMPLEMENTED_PENDING_VERIFY | Exact-head P02 unit/build/browser verification pending |
| GCU-P02-T07 | IMPLEMENTED_PENDING_VERIFY | Exact-head P02 unit/build/browser verification pending |
| GCU-P02-T08 | IMPLEMENTED_PENDING_VERIFY | Exact-head P02 unit/build/browser verification pending |
| GCU-P03-T01 | PLANNED | Not started; previous phase gate required |
| GCU-P03-T02 | PLANNED | Not started; previous phase gate required |
| GCU-P03-T03 | PLANNED | Not started; previous phase gate required |
| GCU-P03-T04 | PLANNED | Not started; previous phase gate required |
| GCU-P03-T05 | PLANNED | Not started; previous phase gate required |
| GCU-P03-T06 | PLANNED | Not started; previous phase gate required |
| GCU-P03-T07 | PLANNED | Not started; previous phase gate required |
| GCU-P03-T08 | PLANNED | Not started; previous phase gate required |
| GCU-P04-T01 | PLANNED | Not started; previous phase gate required |
| GCU-P04-T02 | PLANNED | Not started; previous phase gate required |
| GCU-P04-T03 | PLANNED | Not started; previous phase gate required |
| GCU-P04-T04 | PLANNED | Not started; previous phase gate required |
| GCU-P04-T05 | PLANNED | Not started; previous phase gate required |
| GCU-P04-T06 | PLANNED | Not started; previous phase gate required |
| GCU-P04-T07 | PLANNED | Not started; previous phase gate required |
| GCU-P04-T08 | PLANNED | Not started; previous phase gate required |
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

P00 engineering gate accepted: five verified tasks and one accepted with restrictions, six dispositions complete. P01 complete; G1 PASS on verified implementation head 31befb030931973f63299367d3e8c92147d1ab0f. P02 not started. Resume GCU-P02-T01 through T08 only on explicit user instruction, same integration branch; re-fetch exact main and branch head before edits. P01 correctness and performance evidence below is the comparison baseline. Never treat the ownership attestation as independent publisher/license verification or permission to redistribute raw assets in public. Revisit distribution at P08/P09. No PR created, no main merge, no raw package committed. Record actual tests and exact commits at each phase, with no fabricated results. Final PR only after P09.

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

## P02 execution checkpoint — verification pending

P02 authorized; prior exact ledger CI 45493816235 successful; main unchanged; archive, plan and inventory hashes rechecked. Source references AI.cs 30–78/342, Engine.cs 75/87 and Evaluation.cs 183–223 inspected. Independent one-ply evaluation, typed worker client/protocol, lifecycle, history reconstruction, internal opt-in and legal fallback implemented. Existing heuristic off-thread; no recursive search, no paid content, no P03. P02 gate pending exact-head CI and actual benchmark evidence. See docs/P02_AI_WORKER_FOUNDATION.md.
