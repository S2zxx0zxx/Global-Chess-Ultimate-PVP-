# Static APK visual reference → Global Chess Ultimate implementation map

This is a factual inventory of **static extraction signals only**, not permission to copy intellectual property or an assertion of identical implementation. No APK-extracted raster, atlas crop, proprietary animation, CCBI file or font ships in this project.

## Verified reference evidence
- Chess Clash 8.16.0 contained 2,654 whole PNGs, 370 CCBI layout string tables, 2,200 cropped PLIST sprite frames, 216 SKEL/ATLAS animation sets and 2,301 atlas regions.
- Sprite examples: 541x541 and 721x721 board texture frames; 65x65 and 87x87 chess-piece texture frames. **These are asset pixel dimensions, not CSS hitbox or rendered screen widths.**
- Resolution presets: 540x960 and 720x960 reference layouts, and a 540x960 variant with 63px top/bottom safe-area reservations.
- CCBI hierarchy, coordinates, callbacks, animation timing and online/network behavior were not completely decoded. 292 callback-name indicators are unverified.

## Selected reference scene names and independent equivalent
| Reference name (string-table evidence) | Own screen/component | Status |
|---|---|---|
| GameScene, ChessClock, ChessTimer | Board, player cards and optional experimental clock | PARTIAL |
| CapturedPieces, CapturedPieceGroup | Captures sidebar/tray | NOT-BUILT |
| PieceNode, PieceColorWidget | SVG art set (12 unique vector pieces), board coloring | INITIAL |
| PawnPromotionPopup | Accessible promotion choice dialog | INITIAL |
| GameplayHudMenu | Independent match action sheet | INITIAL |
| MenuHudHeader / MenuHudFooter | Royal app navigation and match HUD | INITIAL |
| MainMenu, MainMenuButtonClassic | Home/Play + local game entry | INITIAL |
| MainMenuButtonPlayWithComputer | Basic offline computer match | INITIAL |
| MainMenuButtonPassnPlay | Local two-seat mode | INITIAL |
| MainMenuButtonPuzzles | Royal Tactics entry (single position) | PARTIAL |
| MatchAnalysisScene, MatchAnalysisReport | Full engine analysis | NOT-BUILT |
| MenuMatchmaking, MatchmakingVSNode | Real live PvP service | NOT-BUILT |
| LeaderboardsMenu, LeagueRankBadge | Ranked leaderboard and ELO | NOT-BUILT |
| DailyMissionsPopup, ClaimRewardsMenu | Durable progression/economy | NOT-BUILT |
| SettingsMenu, PrivacyPolicy | Settings + privacy disclosures | PARTIAL |
| AccountDeletionConfirmation, UpgradeGuestAccount | Opt-in account/cloud identity | NOT-BUILT |
| CustomEventMenu, CustomEventOverview_EntryPoint | Events | NOT-BUILT |
| SeasonPassRankBadge / reward layouts | Battle-pass/rewards | NOT-BUILT |

## Geometry/wiring principles for independent development
1. Use aspect-ratio safe-area CSS and tested touch targets rather than equating sprite pixel rectangles to UI dimensions.
2. Isolate chess.js rules, React UI, local save layer and future online authority; never bind unverified APK callbacks.
3. Connect each user-facing button to an implemented action, or explicitly mark the feature as not connected.
4. Generate original branding and editable icon/piece assets, record their provenance and verify their commercial licensing.
5. Track acceptance gates independently: functional chess, UI, storage, accessibility, Android, real PvP, offline service-worker and release.
6. Source reference scene inventory remains in the separately supplied forensic ZIP; do not commit third-party source binaries into this public repository.

## Priority acceptance milestones
- P0: accurate legal moves, undo, promotion, match termination, local history
- P1: visual consistency, 320/360/412 widths, new original SVG/PNG set with proofs
- P2: actual multiplayer protocol, clock authority, reconnect and anti-abuse
- P3: skills/puzzles analysis dataset, economy, events, licensing and 3D
- P4: HTTPS PWA hosting, maskable raster icon generation, Android AAB, store and physical-device QA

**Never mark an absent module as completed because a source APK has a layout with a matching name.**
