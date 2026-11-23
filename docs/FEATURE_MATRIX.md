# Product / architecture acceptance register

Status definitions: **WORKING-CODE** = implementation exists and can be exercised locally; **UNVERIFIED** = needs independent runtime/device check; **NOT-BUILT** = absent; **REFERENCE-ONLY** = observed in APK but not implemented or legally reused.

| Area | Current status | Next evidence gate |
|---|---|---|
| Independent branding & UI | WORKING-CODE | Screenshot on 320/360/412/768/landscape |
| Local chess + legal moves | WORKING-CODE | Full rules differential, drag/keyboard accessibility |
| Promotion, undo, board flip | WORKING-CODE | Android touch/keyboard/E2E |
| Offline basic computer | WORKING-CODE | Difficulty tiers / worker cancellation |
| Offline chess clocks | UNVERIFIED | Background suspend/time drift; rated clocks need server |
| PGN match history | WORKING-CODE | Storage quota/corruption tests |
| One basic tactic | WORKING-CODE | Curated data, explanation, hints, progress journaling |
| Guest settings and profile | WORKING-CODE | Multi-tab/storage denial testing |
| Loading / startup screens | PARTIAL | Custom accessible splash, boot recovery |
| Screen layouts from APK | REFERENCE-ONLY | Cannot infer exact x/y/active callback logic from strings |
| Online PvP / invitation matchmaking | NOT-BUILT | Durable Objects, idempotency, real two-client sessions |
| Friends / leaderboards / season pass / rewards | NOT-BUILT | Product spec / privacy / abuse & economy |
| Deep analysis / puzzles / coaching | NOT-BUILT | Engine + licensed training dataset |
| 3D model renderer | NOT-BUILT | Babylon separate optional bundle and GPU QA |
| AAB Play Store build | NOT-BUILT | HTTPS deployment + TWA/Bubblewrap / signing / Play Console |
| Android real-device QA | NOT-BUILT | Phone compatibility and accessibility |
| Secure cloud accounts | NOT-BUILT | Design + authorization and consent |
| Live payment / purchases | NOT-BUILT | Entitlements/tax/store policies |
| CDN / asset bandwidth budgets | NOT-BUILT | Real benchmarks after art production |
| External audio / speech | OUT-OF-SCOPE | User intentionally excluded |

## Build milestones

- **GC-U01:** Current playable offline baseline, original UI, PWA manifest and CI.
- **GC-U02:** Component refactor, full accessibility, original board/piece asset suite, responsive QA and legally cleared fonts.
- **GC-U03:** Reliable clocks, profile storage, progress journaling, challenges and engine-backed training.
- **GC-U04:** Cloudflare authoritative real-time match server, retry/idempotency, reconnect, anti-abuse and measured spend.
- **GC-U05:** Ranked matchmaking, fair play, moderation and optional accounts.
- **GC-U06:** Android TWA/AAB signing, Digital Asset Links, store policy, privacy and physical-device certification.
- **GC-U07:** Production release gates: E2E, accessibility, security, load, full provenance, cost guardrails.

All unbuilt work must remain visibly unbuilt. No future gate is marked completed merely because the UI has a button.
