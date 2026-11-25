# AD-04 — Audio decoder toolchain
Scope: preparation and read-only validation, not conversion (AD-05). Owner-authorized source assets; no private banks or audio output in repository. Preserve original sample rate/channels and unique source IDs in later conversion.
## Verified input profile
44 single-stream FSB5 version 1 Vorbis (codec 15) banks; 3,277,408 bytes total; 12,173 length-prefixed packets; all declared bank sizes, seek table lengths, data offsets, zero padding, SHA256 against AD-03 checked. 44.1 kHz throughout; 42 stereo, 2 mono; declared duration sum 257.515102 seconds. Two music records (104.045714 and 86.230204 seconds) have distinct PathIDs. These are header-derived durations, not measured decoded PCM.
## Pinned decoder
vgmstream r2168, immutable source commit d9875b1fff307e4759dfb85e49e3d5e6fb196f7c. Upstream: https://github.com/vgmstream/vgmstream/releases/tag/r2168 ; https://github.com/vgmstream/vgmstream/blob/r2168/COPYING ; https://github.com/vgmstream/vgmstream/blob/r2168/doc/CMAKE.md . Upstream COPYING permits use/copy/modification/distribution with notice; retain dependency notices as well. No binary bundled with the app.
Pinned codebook blob 8662d7c70c18ad0cb7b5768c1be9fb3e0f43cba7: all four actual arrays start with Vorbis setup packet signature and independently computed CRC32 matches ID.
| ID | Banks | Codebook bytes |
|---|---:|---:|
| 20591e7a | 20 | 4225 |
| b6b3868b | 16 | 3832 |
| 28f00387 | 6 | 3484 |
| d6e0bbd4 | 2 | 3771 |
## Setup
Isolated CI workflow .github/workflows/ad04-decoder.yml builds a Vorbis-enabled vgmstream-cli from pinned source, verifies codebooks, records version, binary SHA256 and dynamic dependencies, and uploads binary with notices. No private input, secrets, source APK or PCM output in CI. Linux artifact requires compatible OS/libs; verify checksum and executable bit. Windows: obtain the official r2168 CLI archive from the release page, retain adjacent DLLs and notices; verify source/version and record binary hash. No installation or execution on owner's PC claimed.
Local read-only command (paths outside public checkout):
```sh
python scripts/ad04_audio_preflight.py /path/Chess_UIUX_Extracted_Assets.zip /path/audio_manifest.csv --codebooks /path/vorbis_codebooks_fsb.h --decoder /path/vgmstream-cli > preflight.json
```
Omit optional flags to run structural checks only. Decoder option uses metadata-only -m and records output/exit status; an exit-zero result is not proof of PCM quality or matching sample count. Script handles this observed single-stream profile only; unfamiliar profiles fail closed. AD-05 must verify actual decode, output sample counts/channels/rate/duration, source-to-output hashes, listen QA and individual failures. No normalization, resampling, silence substitution or lossy re-encoding in this task.
## Local verification
Script exact git blob 86ebbcd8a2aa5f0e1819c1d1cf7e24fc77e3090e: Python 3.13.5 syntax compile PASS, actual 44-bank structural probe PASS, four malformed input cases rejected. Upstream codebook CRC validated through connector source inspection, not local decoder execution. vgmstream-cli unavailable; git ls-remote upstream and project failed DNS; ffprobe 7.1.5 direct FSB probe returned Not yet implemented in FFmpeg, patches welcome. No actual decoder metadata or PCM run. Private package Chess_AD04_Audio_Readiness.zip (SHA256 1d691ee025d1d8b010d3e17af4cd329eb1f8011ed64d6ec0a4f9bed6aa352249) includes CSV, JSON, script, README; ZIP CRC checked. Keep outside checkout.
