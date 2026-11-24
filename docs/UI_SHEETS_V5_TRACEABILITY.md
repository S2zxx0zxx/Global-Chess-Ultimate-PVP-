# Global Chess Ultimate — Three-Sheet UI Implementation Traceability

All three supplied visual sheets are **source specifications**, not inspirational moodboards. Existing chess engine/PGN/storage/3D is preserved; previously imported legacy style.css and royal-studio.css were deleted. This document records the React/CSS implementation so changes are not forgotten.

## Sheet 01 — Core 14 mobile screens and tokens

| Design area | Code/data | Acceptance |
|---|---|---|
| Splash, Welcome, Onboarding | RoyalStudio journey + actual cropped gold knight | Interactive guest skip and Next; no mandatory sign-in |
| Home / Mode hub | RoyalStudio home + modes | Classic, Quick, Computer, Pass & Play, Private rooms route to existing handlers |
| Matchmaking | RoyalStudio matchmaking, PrivateOnline | Real private-room frontend; backend not yet live; no fictional queue |
| Gameplay / Results | App royal-match-panel + result overlay | Existing legal game, clocks, real result, replay/analysis |
| Profile / Stats | RoyalStudio profile/stats + existing guest | Local actual match/puzzle data |
| Friends / Leaderboards | RoyalStudio community | Honest empty/no-server states |
| Achievements / Shop | RoyalStudio achievements/shop | Local progress and free themes |
| Notifications / Settings | RoyalStudio preferences | Actual activity data; toggles persisted |
| Style guide | royal-sheets-v5.css | #D4AF37 / #B8860B / #281C12 / #3A2619 / #3F2A1D / #5C4028 / #F5E9D6, 8pt spacing, 48px targets |

## Sheet 02 — Gameplay and interactions

| Design state | Actual implementation |
|---|---|
| Normal turn, green legal markers, last move | App chess.js board / CSS selected/legal/last |
| Check, checkmate, victory/defeat/draw | Chess engine outcome + UI status/result; no pretend rating/XP |
| Promotion | SVG queen/rook/bishop/knight buttons with legal promotion move |
| Resign / Offer Draw | Confirmation dialogs; local Pass & Play accepts draw |
| Chess clock | Wall-clock reconciliation with local pause/resume |
| HUD controls | Chat truthfully unavailable locally; local emote, draw, resign, menu |
| Replay | Actual PGN move-by-move and autoplay |
| Analysis | Local one-ply heuristic/material—not a fake depth-18 engine |
| Tutorial | Five-step interactive legal chess move lesson |
| Motion | piece settle 400ms, capture smoke 600ms, result gold sparkle 1200ms, reduced motion respected |
| Loading/error states | Existing component loading/errors, no claimed backend connectivity |

## Sheet 03 — Product ecosystem

A typed 50-route screen registry remains in RoyalStudio.tsx: journey 7, arena 7, competition 8, community 6, progression 8 and preferences 14. Includes tournaments, detail, bracket, missions, daily, season, news, community, clubs, invitations, membership, checkout, inventory/customization, appearance, privacy, feedback, offline and alerts. All screen navigation is local and interactive; **live backend dependent features** render honest unavailable/empty states rather than fabricated data.

## Asset source and compliance

- public/art/sheet-gold-knight.svg embeds an optimized WebP crop of the third user-provided sheet, cropped to exclude reference-product text. It is re-used on splash, onboarding, Classic card and modes.
- public/pieces/*.svg are existing original chess pieces used by actual legal boards.
- Screen screenshots are not substituted for interactive screens.
- Never introduce voice or microphone functions.

## Release gates still separate

Actual Google/Email authentication, public/rated matchmaking, clubs/chat, tournaments/prizes, coin wallet, payment processing, server anti-cheat, full premium 3D asset delivery and Android AAB signing need backend/security/device validation not provided by UI sheet images. This traceability does **not** certify a fully live commercial game.
