# AD-02 — APK asset provenance and quarantine
Source identity: locally supplied Chess.apks, package com.bigcake.android.chess.offline, version 1.0.11 (13), Unity 2022.3.62f2. This is distinct from the older Chess Clash source in docs/ORIGINALITY.md; that policy remains in force.
## Verified inventory (2026-11-25)
Each non-directory archive member was streamed through SHA-256, including all nested APK members. 5,480 records, 4,082 distinct content digests; repeated entries across derivative packs are not unique assets. Private CSV Chess_AD02_Private_Provenance.csv (SHA256 915e7151012f35ef501851519b29520a0bf23df134b177b75ebbda57c7a5c61b) remains outside this public repository. Each row has source archive, entry path, byte count, digest, rights-holder status, license evidence status, quarantine and ship decision. All default to NO ship, including metadata and reports, pending review; not a claim all entries are proprietary.
| Archive | Entries | SHA256 |
|---|---:|---|
| Chess.apks | 3 (plus 2758 nested) | c55a52c6344d6fae5c5e29f5c2ae9824e59374e3f1f9359b5c489facaca2f61f |
| Chess_UIUX_Extracted_Assets.zip | 2090 | 2e5715c2ae0741e38a84c08a353e54292483c2b922b377149c03007189eab132 |
| Chess_Boards_and_Pieces.zip | 368 | b3f7f9528ce2ae74a7f43ea2e7ecad0d822ac4c9e5f8a7652f941ced487c7fa9 |
| Chess_Unity_Raw_Evidence.zip | 55 | bf242b686132c94ed56b40fa6525f88e6249ce52dc502278ef73d0279b89fb19 |
| Chess_Adoption_Readiness_Pack.zip | 206 | ee1261c7aaa7fccc19ecfe6d7f76fec4a2bec8a5f57ede7ad86c503968327984 |
## Rights review
Base APK contains five AndroidX LICENSE.txt entries (Apache-2.0 confirmed by reading annotation notice; other four filenames observed), two public-suffix NOTICE entries (one read, MPL-2.0 applies to public suffix list) and res/raw/license (Open Measurement License v1.1, read header). These do not grant rights to chess graphics, layouts, fonts, recordings, puzzles, animation data or other SDK content. Publisher/contributor-specific ownership and grants not established. No source-specific reuse grant found in inspected materials. Fonts: names/atlas contents are not sufficient to establish upstream license or permission to redistribute the packaged version. Obtain clean upstream font files and notices separately if needed. Spine runtime requires separate license review: https://esotericsoftware.com/spine-runtimes-license and https://esotericsoftware.com/spine-editor-license ; exact pinned 4.2 runtime terms and applicable entitlement still unverified. No runtime added.
| Group | Decision |
|---|---|
| Board/piece PNGs, UI art, icons, backgrounds, logos, screenshots | research only; no shipping without documented rights |
| Audio/FSB, Unity clips, Spine skeleton/atlas/texture | research only; format conversion is not a grant |
| Prefab layouts, metadata, compiled code, puzzles, config, SDK assets | research only; independently implement general behavior, do not copy protected expression or data |
| Existing repo assets and dependencies | unchanged; existing provenance policies apply; not re-certified by this review |
| New original / independently sourced licensed replacements | candidate only, review before packaging |
## Quarantine rules
Keep original and derived files outside the checkout, build context, public/, src/, dist/, PWA cache and release artifacts. Optional local .apk-quarantine/ is ignored but external storage is preferred; never git add -f. No raw asset or private per-entry manifest in public PR. No automatic promotion. For any proposed candidate record stable ID, original author/rights-holder, acquisition URL or written grant, license/version, permitted commercial redistribution/modification, attribution/notice obligations, source SHA256, prepared SHA256, intended path, derivative record and reviewer approval. For proprietary material obtain actual written grant; for open assets obtain independently from the licensed source. Do not approve based on file extension or name. Keep confidential permission evidence outside public repo and reference a non-sensitive evidence ID.
The new node test checks known archive/quarantine names, APK extensions and reserved adoption staging paths among tracked files. It is a path-based tripwire, not a full content or legal scan; renamed copies are not detected. No adoption shipping path is open yet. Later integration must add a reviewed allowlist and hash verification before admitting new assets; existing asset paths unaffected. Do not disable the guard to ship unreviewed material. No dependencies, rules, backend, UI, saves or multiplayer changes in AD-02.
