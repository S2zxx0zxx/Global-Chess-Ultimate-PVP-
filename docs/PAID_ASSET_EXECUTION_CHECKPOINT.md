# Paid asset integration — execution checkpoint

Plan: GCU-ASSET-2026-11-v1.0. User authorized BUILD of P00 only; P01 requires an explicit passed P00 gate and subsequent user instruction. Single integration branch `feat/paid-asset-engine-integration` for P00–P09; no PR until final integration review; no merge to main until final gates. This supersedes the master plan's per-phase branch/PR scheme, not its requirements. Do not delete the existing V4 archive branch. No runtime changes in P00.

## P00 evidence

- Pinned main: [9469a533de86539260fd0483a187f31ffc16a515](https://github.com/S2zxx0zxx/Global-Chess-Ultimate-PVP-/commit/9469a533de86539260fd0483a187f31ffc16a515); compare returned identical, zero file delta. New integration branch created from this SHA. Repository is public.
- User-supplied package: Chess Game Template v1.1.1.unitypackage; SHA256 d79d87045aadd506c9ba5714a3699eadbb60004b1f2737190ba2344b28098f1c; 2,949,496 bytes. Internal ReadMe says version 1.1, unresolved version discrepancy. Publisher ID 19836 from ReadMe, not independently confirmed listing.
- Local-only master plan SHA256 af8e19f57ad529cf2f8525728ba4441319a55716e69c6b9e5b813bebe81530a9. Local-only GCU_P00_Private_Inventory.json SHA256 be2b8d8c27735336131beb9704d6b552e5f58c86e9a3f78ed36695e39c386952. Retain these original user-side files for subsequent sessions; recheck hashes before relying on them.
- Archive inspected without extracting into repo: 350 unique tar members (85 directories, 265 regular files); 85 pathname records, 77 nonempty payloads, 8 folder records. All 85 path/size/hash records and dispositions matched master plan. 70 asset.meta, 32 preview.png and one .icon.png tracked as archive auxiliary records; not adopted. No symlinks or nonregular member types. Pathname records contain a trailing newline and 00 marker, normalized before matching. 19 C# scripts / 4739 lines; 27 PNG, 5 MP3, 3 animation clips, 2 controllers, 2 scenes, 2 prefabs, 15 settings, one PDF and one ReadMe. No raw proprietary content is included in this commit.
- All 84 task IDs unique and their dependencies resolve to preceding IDs, checked locally with Python. Counts per phase: 6, 8, 8, 8, 8, 8, 8, 8, 12, 10. Full task descriptions, asset disposition and dependencies remain in the exact local master plan; this ledger records progress and safe restart position.

## License gate — BLOCKED

The user states the package is paid. No receipt, asset order, exact listing terms or separate third-party notice provided. No dedicated license payload found in inventory; keyword scan of scripts does not establish ownership or third-party rights. Current Unity standard EULA is a general reference only: https://unity.com/legal/as-terms and https://assetstore.unity.com/browse/eula-faq. Standard embedded product rights do not establish rights to raw source redistribution; current terms also include restrictions on use of assets as AI inputs/creation. Verify purchase-specific terms and any required express permission, including AI-assisted processing, before further proprietary asset adoption. Do not claim license clearance. Keep the package, code, media, sprites, documentation and private manifest out of public repo and public CI artifacts. General chess algorithms may be independently designed from public specifications only; do not copy proprietary code or evaluation tables. If entitlement/permission is unavailable, record an approved original/open-license alternative in a future decision, not an implicit waiver. No paid service enabled.

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

## Requirements / defects / decisions

All source mechanisms accounted for in master plan. Scope mapping: P01 rules/perft/FEN/undo; P02–04 independent search, evaluation, time limits, ordering, PV, position identity and bounded cache; P05 mode lifecycle; P06 replay and learning; P07 input/motion/events; P08 optional licensed media and transition concepts; P09 integration, distribution and release. Keep canonical chess.js, do not replace React/Three.js or add Unity runtime. Asset risks R01–R12 from plan are static observations/hypotheses, not runtime reproductions: R01 fixed time -> request budget; R02 synchronous search -> worker; R03 elapsed seconds -> monotonic deadline; R04 checked quiescence -> all evasions; R05 incomplete hash -> full position identity; R06 FEN counters -> canonical round trip; R07 coordinate bounds -> validated pointer; R08 undo indices -> canonical state; R09 terminal mislabel -> separate reasons; R10 unchecked callback -> commit-only events; R11 sound index -> verify actual mapping rather than assume array size; R12 perft overflow -> BigInt. Do not copy proprietary source. No new network services, payments, or ranked matchmaking in scope.

## P00 proposed contracts (design evidence, no implementation)

Worker message v1: request {protocol:1, searchId, gameId, revision, purpose:play|analysis, initialFen, moves:UCI[], limits:{timeMs,maxDepth,maxNodes}}. Validate bounded input lengths, legal replay and finite integer budgets; worker returns matching IDs, completedDepth, nodes, elapsedMs, score with perspective and mate/centipawn discriminator, legal UCI PV, status complete|timeout|cancelled|error|terminal, optional candidate. Worker is advisory only. Controller rejects stale IDs, mismatched position/revision, illegal candidate, expired clock, nonactive mode; cancel/terminate on restart, undo, pause, route exit, timeout or finish. Preserve game history/repetition by replaying canonical moves rather than only FEN. No live online hints. Use monotonic performance.now for search; existing wall-clock clock reconciliation for match. Worker hard-stop and fallback validated; never invent completed depth. Fallback existing bounded heuristic only, with visible degraded state.
 
Committed event envelope: {version:1, gameId, revision, eventId, kind, payload}; move committed, capture, check, promotion, turn change, match ended. Emit after successful canonical move, deduplicate per event ID, allow visual/audio consumers to fail independently. Keep pointer tap and keyboard access. Persist versioned JSON with additive fields and defensive read/validation; existing gcu.*.v1 and PGN remain readable; worker jobs transient, no raw assets in storage. Recovery revalidates state before starting another search. No new production API.

Performance protocol (provisional design targets, not measured): fixed seed and position corpus; start position perft 20/400/8902; independently verify Kiwipete FEN before reference counts; castling-through-check, pinned/en-passant discovery, four promotions, mate/stalemate/repetition/counters and undo state. Search benchmark fixed depth/node budget, paired old-vs-new tactical corpus, warm/cold runs, report p50/p95 over at least 30 runs per preset, actual completed depth, nodes, memory, timeout overshoot; no Elo assertion. Proposed starting budgets 100/300/750/1500ms with explicit max depth/nodes and remaining-clock clamp, tune on low-end hardware; check 1ms and long deadlines, no search-induced main-thread task >50ms; 30-minute bounded-cache run. Device matrix: 320/360/414/768 widths, portrait/landscape Chromium, physical Android low-end and current device if available; record model/OS/browser, frame/long-task metrics, offline warm reload, touch/mouse/keyboard, 2D/3D, undo/promotion/capture, replay, storage denial. Physical device and deployed runtime not verified. P01–P09 implement/test only after phase gate.

## Task ledger

| GCU-P00-T01 | VERIFIED | Package identity and version mismatch verified |
| GCU-P00-T02 | VERIFIED | All payload hashes and dispositions verified |
| GCU-P00-T03 | BLOCKED | Entitlement, applicable license and AI-use permission not verified |
| GCU-P00-T04 | IN_PROGRESS | Exact-main CI and source baseline captured; prerequisite blocked |
| GCU-P00-T05 | IN_PROGRESS | 84-ID dependency register validated; source/risk mappings prepared; prerequisite blocked |
| GCU-P00-T06 | IN_PROGRESS | Integration and performance contract prepared; prerequisite blocked |
| GCU-P01-T01 | PLANNED | Not started; previous phase gate required |
| GCU-P01-T02 | PLANNED | Not started; previous phase gate required |
| GCU-P01-T03 | PLANNED | Not started; previous phase gate required |
| GCU-P01-T04 | PLANNED | Not started; previous phase gate required |
| GCU-P01-T05 | PLANNED | Not started; previous phase gate required |
| GCU-P01-T06 | PLANNED | Not started; previous phase gate required |
| GCU-P01-T07 | PLANNED | Not started; previous phase gate required |
| GCU-P01-T08 | PLANNED | Not started; previous phase gate required |
| GCU-P02-T01 | PLANNED | Not started; previous phase gate required |
| GCU-P02-T02 | PLANNED | Not started; previous phase gate required |
| GCU-P02-T03 | PLANNED | Not started; previous phase gate required |
| GCU-P02-T04 | PLANNED | Not started; previous phase gate required |
| GCU-P02-T05 | PLANNED | Not started; previous phase gate required |
| GCU-P02-T06 | PLANNED | Not started; previous phase gate required |
| GCU-P02-T07 | PLANNED | Not started; previous phase gate required |
| GCU-P02-T08 | PLANNED | Not started; previous phase gate required |
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

P00 gate is BLOCKED, not passed. T01–T02 verified; T03 blocked; T04–T06 independently prepared while waiting for prerequisite, not signed off. This is an explicit deviation allowing non-mutating baseline/design work in P00 without starting a later phase. Resume T03 with purchase entitlement and applicable license/publisher permission; if unavailable, obtain user approval for a revised asset-free scope and update gate explicitly. Then sign off T04–T06 against exact branch/main and evidence; do not start P01 until P00 accepted. No PR created, no main merge, no raw package committed. All later phases remain planned. Re-fetch branch head and main before every new turn; record test evidence and exact commit after each phase. 
