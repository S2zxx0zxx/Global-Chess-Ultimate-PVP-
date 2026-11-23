# Install the optimized three-pack asset bundle

1. Download Global_Chess_Ultimate_Optimized_3D_Assets.zip from the ChatGPT result.
2. Unzip it. At its root you should find asset-manifest.json, models/, previews/, chessset/ and humanoid/.
3. In a working copy of the new repository, check out branch feat/user-asset-3d-integration. Create public/assets/.
4. Copy the extracted ZIP contents into public/assets/ without renaming directories. Example: public/assets/models/deco/king_light.glb and public/assets/chessset/models/SM_WhitePawn.fbx.
5. Run npm install and npm run dev. Open a match -> 3D BOARD. In Settings enable Load supplied 3D library and choose a theme. Missing optional models use procedural pieces.
6. From Profile, open Animation Studio. All 43 named non-root-motion clips are available if the humanoid GLB was installed.
7. Static hosting must serve GLB/FBX/WebP from HTTPS with correct MIME headers and caching policy. Do not put all 90 MB in the PWA app shell pre-cache.

The GitHub branch alone does NOT embed these binary files: the supplied ZIP is a companion asset package. A hosted preview and signed Android AAB need separate deployment configuration and device checks. The chess 3D library has ~55k triangles per piece, so loading it on underpowered devices can cause slow rendering. Set up LODs / measured FPS limits before enabling all detailed models by default.
