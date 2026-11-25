# P08 source-grounded asset and sensory integration

Original source SHA-256 d79d87045aadd506c9ba5714a3699eadbb60004b1f2737190ba2344b28098f1c; master plan and private inventory hashes match. No source binary/media in public git or CI. User ownership attestation accepted in P00 with distribution restrictions; independent redistribution scope not verified. No raw or converted proprietary asset deployed. Private review only; stage outside repo, record source hash, publisher/receipt/redistribution scope, reviewer and approved derivative hashes, then separate explicit distribution review. Public CI has no access to archive or private output. Never place staging under public/dist, no Unity build or publisher promotion. Original synthesized effects are independent, not recordings or copies.

## T01 exact Unity binary mapping
Parsed version-17 serialized file header, type trees, object table and external PPtrs, validating object lengths. GameScene GameManager object 2082725846 array length 6, each pathID 8300000:
| Index | External fileID | Asset | Source event |
|---|---:|---|---|
| 0 | 33 | StartSound.mp3 | GameManager.cs:27 start |
| 1 | 34 | swapSound.mp3 | UIManager.cs:22 transition / LuxChess2D.cs:230 undo |
| 2 | 35 | downSound.mp3 | AI.cs:49 deadline exit |
| 3 | 36 | Chach.mp3 | LuxChess2D.cs:175 check |
| 4 | 34 | swapSound.mp3 | PieceMover.cs:38 pick |
| 5 | 35 | downSound.mp3 | PieceMover.cs:53 release |
Separate AudioSource 500517632 m_audioClip external fileID 13/pathID 8300000 = GameOverSound.mp3; not seventh array member. GameManager.cs:38 triggers GameOver animator; do not infer every source playback timing from filename. SquarePrefab references PieceMover and brownSq; SquarePrefab2 references PieceMover and built-in resources. Source plays pick/drop even before legality in places; new committed events avoid that error.

## T03 private objective MP3 audit
ffprobe all codec MP3 stereo 44100 Hz; ffmpeg all decode success to mono 44100 float32; unique SHA256 all five (swap/down same file size, not byte-identical). Pipe decoding duration includes decoder padding. Silence fraction absolute amplitude < .001; peak linear full-scale; clipped count counts samples abs>=1 in downmix.
| Clip | Bytes | Decoded seconds | Peak | RMS | Silence fraction | >=1 samples |
|---|---:|---:|---:|---:|---:|---:|
| StartSound |21385|0.88816|1.32607|.16746|.16419|53|
| Chach |45836|1.90694|1.13391|.09917|.53265|2|
| swapSound |9474|.39184|.42994|.02712|.69236|0|
| downSound |9474|.39184|1.33848|.06242|.57934|19|
| GameOverSound |23266|.96653|.89693|.12654|.08566|0|
All nonempty; no corrupt decode detected. Reject direct deployment: over-full-scale decoded peaks in three files, short low-level cues and silence in others require subjective review and gain normalization decisions. Human listening is NOT verified by this session. Event semantics mapped from serialized references/source, not from hearing. T03 objective portion done; required listening gate OPEN. No paid clip approved for build. Original synthesized short effects provide offline fallback, not a claim of paid integration.

## T04–T06
Centralized WebAudio controller, opt-in, gesture unlock, original deterministic in-memory buffers, independent board/result gains, two simultaneous voices max, cleanup and no gameplay dependency. One cue per canonical committed move priority check/capture/promotion/move, separate pick/invalid and result, revision/game identity dedupe, undo/replay no commit sound; no stale queued cue across stop/game change. Haptics opt-in, old local preference migrated, browser/OS reduced motion respected, unsupported/rejected API silent. No microphone, voice, network or music. Real playback scheduling tests are not subjective sound quality or physical vibration proof.

## T07 3 animations / 2 controllers
All three binary clip records decoded: 60Hz, no loop. CloseAnimation 1s alpha 0→1; Popup_Animation 1s UI anchored transforms/active state; StartScreenAnimation 1.5s alpha 1 through .5s then fade to 0. BG controller one default CloseAnimation state; UICanvas has StartScreenAnimation and Popup_Animation, GameOver trigger transition duration .25s. Existing React result/promotion and route state already canonical; add original 180ms entrance, no blocking 1–1.5s intro or imported controller. Reduced motion bypass.

## T08 14 skin images
GameScene LuxChess2D object 1146757747 Sprite PPtrs pathID 21300000. White p/b/n/r/q/k = Figures_11/9/10/8/7/6; Black p/b/n/r/q/k = Figures_5/3/4/2/1/0. White lightSq / black brownSq, 124x124 each. Dimensions and lossless WebP byte trial (in-memory only; no files exported):
| Sprite | Dimensions | Original PNG bytes | WebP bytes | Optimized PNG bytes |
|---|---|---:|---:|---:|
| 0 |52x57|20974|3192|5189|
| 1 |60x56|21301|3398|6160|
| 2 |44x50|19384|2096|3507|
| 3 |56x60|19836|2346|4891|
| 4 |52x51|20432|3324|5153|
| 5 |38x51|18143|1800|3019|
| 6 |53x58|20234|2926|5041|
| 7 |60x56|21437|4140|6604|
| 8 |43x51|18813|2136|3345|
| 9 |56x60|20697|3264|5702|
| 10 |52x52|19809|3100|4839|
| 11 |37x52|18310|2038|3285|
| lightSq |124x124|20843|4452|7568|
| brownSq |124x124|21414|5174|7738|
Mean linear relative luminance light .2053/dark .0307, ratio ~3.16:1 (texture average, not per-piece contrast certification). Low sprite native resolution unsuitable for premium high-DPR rendering without quality review. No approved licensed skin; reject/defer these optional media, retain original SVGs and all four existing palettes, never replace Royal V5 wood default.

## T09 remaining 13 PNGs + 2 prefabs
Button 645x163: menu control concept, existing CSS buttons. grey 64x64: unreferenced in scene mapping, exclude. ShareButton/RateUs 394x394: concepts only, actual capability/verified listing required. logo 117x162: exclude external publisher branding. HomeButton/RestartButton/UndoButton/PopupWin 720x720: existing accessible controls/result, unnecessary bitmap bloat. MainMenuBG/GameBG2/BG3 1080x1920: avoid theme replacement and large background download; GameBG2 not referenced in observed scenes. NoPiece 256x256 fully transparent: DOM empty cell, omit. All decode through Pillow. SquarePrefab and SquarePrefab2 13 objects each, serialized PieceMover references; actual square geometry and event guard already P07, no Unity prefab/physics import.

## T10 scenes and 15 settings
MainMenu 80 objects, 10 external refs; GameScene 216 objects, 37 external refs. Both serialized 2017.3.1f1; settings 5.6.2f1/2017.3.1f1/2018.2.0f2. Canvas scalers 1080x1920 match .5 (main and game), one game canvas 1920x1080 match 1. Source GameManager enables canvas after .5s with width/height match 1. Web uses responsive CSS and canonical React state, no fixed Unity resolution or blocking transition. AudioManager volume 1, default sample rate/DSP buffer, 32 real / 512 virtual voices; use original 2-voice cap. TimeManager fixed .02s/max .333s/timeScale 1; no physics simulation in chess. QualitySettings current 0 Fastest, shadows off, AA 0; adapt via procedural Three.js fallback, no forced platform quality.
Settings disposition: InputManager pointer/keyboard concepts; TagManager layers/tags excluded; ProjectSettings orientation/scaling/native config excluded; NavMeshAreas excluded; Physics2DSettings excluded; AudioManager concepts above; GraphicsSettings shader/render config excluded; TimeManager wall-time/animation concept only; ClusterInputManager excluded; DynamicsManager excluded; QualitySettings above; UnityConnectSettings analytics/ads/purchasing excluded; EditorBuildSettings scene transitions mapped to React pages; PresetManager and EditorSettings editor-only excluded. All 15 serialized header/type trees and object records opened; no platform profile imported.

## T11 share/rate
Share only origin root (no room token, query or publisher URL); native Web Share where available; clipboard fallback except user cancellation; explicit unavailable state. Rate remains unavailable until official store listing verified. No placeholder or fake store.

## T12 packaging
Compiled original synthesized PCM, no MP3/PNG of paid package in public build, no external audio fetch. Existing versioned offline manifest contains JS and existing SVGs. Public dist audit rejects raw Unity/audio files and archive/MP3 SHA-256 matches. Actual offline browser evidence pending. Private paid listening/permission not waived; P08 gate stays OPEN, P09 not started.
