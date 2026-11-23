# Three uploaded asset libraries — verified implementation register

## Source inventory
| Archive | Real files | What exists |
|---|---:|---|
| Universal Animation Library 2 Standard | 13 | 3 GLB, 3 FBX, one Blender source, three images, text docs |
| ChessSet | 37 | 15 FBX, 15 PBR texture PNG, Blender project and demo media |
| 3D Chess Sets Pack 1 | 98 | 48 GLB, 48 GIF previews, two docs |
| TOTAL | 148 | All entries statically inventoried with SHA-256 |

Universal animation GLB contains 43 unique named humanoid clips, plus another 43 clips in a root-motion variant, with a 65-joint skeleton; female mannequin GLB is separate. These motions do not directly apply to chess-piece models.

Four chess themes are complete: Bauhaus, Art Deco, Sci-fi and Egyptian. Each has six piece types in two colors. All 48 chess GLBs total 2,714,084 triangles; 54,428 to 59,520 each. Their GLBs contain zero skeletal animations and zero skin rigs. They are heavy static 3D geometry, not physics/matchmaking logic.

ChessSet includes one board FBX, twelve chess-piece FBX files, two checker-piece FBX files, and fifteen color/normal/roughness/metallic/displacement texture PNG files. The original FBX geometry is preserved in the prepared pack; its texture derivatives are resized WebP.

## Prepared asset archive
The companion ZIP is called Global_Chess_Ultimate_Optimized_3D_Assets.zip. It contains 48 GLBs with embedded PNG textures reduced to 512x512 or smaller, 48 static WebP thumbnails, 15 FBX meshes, 15 WebP material textures, 3 animation/mannequin GLBs and a SHA-256 manifest. Geometry and animation buffers are preserved, not simplified. Source selected files: 212.65 MiB; prepared assets: 121.50 MiB; compressed optional ZIP: about 89.7 MiB.

## Implementation in this branch
- 3D chessboard: src/ChessBoard3D.tsx, loaded on demand, uses the existing chess.js state and legal-square input, board flip, lights and camera.
- Asset loading: optional art manifest check followed by GLTFLoader for Bauhaus/Deco/Sci-fi/Egypt and FBXLoader for ChessSet. Missing files fall back to the original procedural chess pieces.
- Classic PBR materials: ChessSet maps are loaded from their prepared WebP file paths on demand.
- Profile animation studio: src/AnimationShowcase.tsx uses the non-root-motion humanoid GLB, displays clips with AnimationMixer, not requested during game startup.
- All voice/microphone/speech functionality remains excluded.

## Non-claims and release blockers
This PR cannot upload large source binary files automatically. The optional art archive must be installed under public/assets in a development checkout. Without it the GitHub code and preview do not contain the premium chess GLBs. The original source animations do not provide chess capture, chess movement, backend physics, friend lists, online matches or ratings. A real Android AAB, reliable render performance, mobile accessibility, real-time PvP and full original game asset polish remain unbuilt.

License text: Two archives contain CC0 declarations; the ChessSet ZIP contains no embedded licensing document. User-provided ownership claims are not independently verified. No automatic claim of exclusive copyright over external resources is made.
