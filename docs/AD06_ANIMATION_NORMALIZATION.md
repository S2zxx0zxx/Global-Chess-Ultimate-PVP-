# AD-06 — Unity animation normalization
Scope: structural normalization only, not AD-07 property binding or runtime interpolation.
## Verified evidence
106 AnimationClip records in 3 serialized sources (103 Animation bundle, 2 data/sharedassets0.assets, 1 Spine bundle). Exact source identity is serialized file plus decimal-string PathID, not name; two names each repeat twice. All 106 raw object hashes match AD-03 byte ranges. Re-decoded all 106 raw object records with existing type-tree parser (exact type-hash reuse for stripped source), compared full exported metadata, all match. Stream words also uniquely located in raw object when nonempty.
- 1,416 streamed curve indices; 1,233 frame records (1,048 timed, 185 boundary/sentinel); 6,163 streamed key records (4,747 timed, 1,416 boundary); 33,281 original uint32 words round-trip exactly. Coefficients retain both float representation and source words. No sentinel is treated as an ordinary timestamp.
- 548 constant values; 47 clips contain constants. All 106 dense-array count checks pass: zero actual dense curves/samples in this source. Preserve original dense headers without synthesizing samples.
- Seven direct curves (5 scale, 2 float), 22 direct keyframes with weights/tangents and metadata. 1,282 generic bindings and 96 event records, 20 distinct event names; all timed frame/event times within declared clip range. 98 clips at 60 fps, 8 at 30 fps, 6 loop-enabled, 5 zero-duration. Retain all; zero-duration clips are not assumed broken.
- Independent verifier compared normalized data with original decoded exports, round-tripped source words, checked track indices and exact float coefficient bits, raw byte sequences, hashes, timing, direct curves, bindings/events. 106/106 pass. Four negative mutations (stream word, dense count, timing, bad raw bytes) rejected. This is structural verification, not an independent Unity engine implementation.
## Private deliverable
Chess_AD06_Normalized_Animations.zip, 219 entries, 435330 bytes, SHA256 14fd7fc1cc98f377ce976677bfbf0f02157b474b3e9e221aa0cd8990546ffa9d. ZIP CRC PASS. Includes 106 JSON records and 106 exact original object binaries, index, summary, verification and additional checks, two scripts and README. Raw objects retain any binary fields summarized by the earlier JSON exporter. Keep private pack outside checkout until AD-13 prepared asset catalog. No private binary/animation data committed.
## Reproduction
Python 3.9+, standard library; use AD-03 unity_objects.csv. Run:
```sh
python scripts/ad06_normalize.py Chess_UIUX_Extracted_Assets.zip Chess_Unity_Raw_Evidence.zip unity_objects.csv NEW_OUTPUT_DIR
python scripts/ad06_verify.py Chess_UIUX_Extracted_Assets.zip Chess_Unity_Raw_Evidence.zip NEW_OUTPUT_DIR
```
Exact tested Git blobs 693c3b39d31373589a55d5400f077b24273065f6 and 754278540af0f464bc2c8b14ee2b14d2cf66178d.
## Remaining work
Bindings are unresolved; no assumptions about path hash resolution, packed transform components, curve polynomial evaluation, step/tangent behavior, event callbacks, or Unity runtime playback. AD-07 must derive property binding/interpolation using evidence; AD-21 later integrates UI animation adapter. No synthetic animations, UI or gameplay changes, new runtime dependency, merge or deploy.
