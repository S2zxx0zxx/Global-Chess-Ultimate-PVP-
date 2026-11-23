# Global Chess Ultimate — Production Work Orders

Status checked against the new repository PR #1 and PR #2 on 2026-11-23. This is an executable backlog, not a claim of completion. References to the supplied Chess Clash APK are only static extracted information; the original proprietary gameplay/server source is unavailable.

## P0 Core game correctness
- [ ] GC-U10-01: Versioned match snapshots, pause/resume recovery, time controls reconciled with real elapsed time, no duplicated results
- [ ] GC-U10-02: Correct history & replay from PGN with saved FEN at every ply, copy/export, handling damaged records
- [ ] GC-U10-03: Promotion, click/touch, undo vs bot, visible outcome, draw and resign acceptance
- [ ] GC-U10-04: Puzzle academy (curated valid puzzles, per-puzzle progress, correct-move enforcement, import licensing)
- [ ] GC-U10-05: Run high-value browser and device interaction checks including visual/readability and offline resilience

## P1 Render and supplied asset integration
- [ ] GC-U11-01: Move/capture interpolation on Three.js scene with camera flip and reduced-motion rules
- [ ] GC-U11-02: Authoritative source manifest checksum and safe optional asset install
- [ ] GC-U11-03: Real GLB/FBX geometry import from user ZIP; optimize LOD/poly budget, static-board material, race & memory handling
- [ ] GC-U11-04: Integrate avatar animations only where appropriate (humanoid not chess-piece skeleton)
- [ ] GC-U11-05: Measure mobile FPS/memory/download, 2D fallback and accessibility

## P2 Online chess
- [ ] GC-U12-01: Authless private rooms with secure invitation tokens, server-authoritative move validation, rate limits and replay protection
- [ ] GC-U12-02: Socket reconnection, presence, authoritative clocks and outcomes
- [ ] GC-U12-03: Public matchmaking, ranked profiles, moderation, fair play, reconnect and telemetry
- [ ] GC-U12-04: Independent two-device staging and load/resilience testing

## P3 Product completeness
- [ ] GC-U13-01: Full training, annotated review, engine evaluation and daily content
- [ ] GC-U13-02: Friends, tournaments, ranked seasons, leaderboard and account lifecycle
- [ ] GC-U13-03: Rewards/progression economy with no unearned/false rewards and abuse protection
- [ ] GC-U13-04: Finished animations and cosmetics/visual system across 2D and 3D

## P4 Release
- [ ] GC-U14-01: HTTPS live web/PWA deploy and configured static-asset CDN, offline and app-updating
- [ ] GC-U14-02: Android TWA/Bubblewrap AAB, valid DAL, original PNG launcher/splash sizes, Play Console policy compliance
- [ ] GC-U14-03: Production accessibility/security/privacy tests, license/provenance confirmation and real-device acceptance
- [ ] GC-U14-04: Release monitoring, rollbacks, budgets and sign-off

## Rules of delivery
- Never mark an item DONE without code plus its relevant acceptance evidence.
- Do not import closed-source Chess Clash copyrighted assets/code into the public app simply by changing brand names.
- User ZIP art may be deployed according to verified ownership and permissions; keep the original provenance separately from original authored code.
- No voice/speech/microphone features.
- PRs remain draft/unmerged until the applicable checks are met; no release claim based on tests alone.
