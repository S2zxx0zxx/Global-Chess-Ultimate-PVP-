# Global Chess Ultimate

Independent original royal chess game, built as a web/PWA-first foundation for future Android packaging. Not affiliated with Chess Clash or Miniclip.

## Working in the current branch

- Click-to-move legal chess, promotion, check, checkmate, castling, en passant and standard draw conditions via \`chess.js\`
- Offline pass-and-play and a deliberately basic local computer opponent
- Experimental browser 10-minute clocks (not authoritative)
- One original local tactic; local guest profile; saved match/resume; recent PGN history
- Original responsive burgundy / warm-gold UI, SVG crest, installable PWA shell
- No microphone, voice chat, tracking, ads, payments or third-party commercial art

## Local development

\`\`\`bash
npm install
npm run dev
npm run verify
npm run preview
\`\`\`

GitHub Actions builds the \`dist/\` web/PWA preview artifact on pushes and PRs. A preview artifact is not a hosted site. Serve \`dist/\` with a static host and HTTPS before testing production PWA installation.

## Reality check

This is **not** a feature-complete port of the provided Chess Clash APK. That APK exposed asset indices, string-table layout references and metadata, not source code, full runtime wiring, matchmaking services, proprietary animations or legal rights. Our game does not ship APK-extracted images, fonts, code or audio. Ranked multiplayer, robust engine analysis, Android AAB, cloud accounts, accessibility device QA, security review and Play Store compliance remain open.

See \`docs/FEATURE_MATRIX.md\`, \`docs/ORIGINALITY.md\`, and \`docs/ANDROID_RELEASE.md\`.


## Optional 3D user-supplied asset library (follow-up PR)

This branch adds a lazily loaded interactive Three.js board (2D remains the default), optional four complete high-detail GLB chess-piece styles, a ChessSet FBX+PBR path and a 43-clip humanoid animation preview in Profile. The uploads have been catalogued and texture-optimized in a separate, downloadable asset ZIP. That binary pack is not checked into the public repository: install it under public/assets/ following docs/INSTALL_USER_ASSETS.md. Run npm run assets:verify:strict after installation. A missing pack yields procedural 3D pieces, not source pack models. It does not add online multiplayer, Android AAB or Chess Clash source logic. See docs/ASSET_LIBRARY_IMPLEMENTATION.md.
