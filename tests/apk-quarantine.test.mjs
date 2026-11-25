import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

// Deliberately narrow: prevents known reference paths and all unreleased
// adoption staging assets from entering the tracked repository. Not a license scanner.
function prohibited(path) {
  const p=path.replaceAll('\\','/').toLowerCase();
  const parts=p.split('/');
  return /\.(apk|apks|xapk)$/.test(p) ||
    parts.some(s=>s==='.apk-quarantine'||s==='chess_adoption_readiness'||s==='chess_audit_work'||s==='chess_ad03_private'||s==='chess_ad03_private_manifest.zip'||
      /^chess_(uiux_extracted_assets|boards_and_pieces|unity_raw_evidence|adoption_readiness_pack)\.zip$/.test(s)||
      /^chess_ad02_private_provenance\.csv$/.test(s)||
      /^chess_extracted_(boards|piece_themes)\.png$/.test(s)) ||
    /^(public\/assets|src\/assets)\/apk-adoption(?:\/|$)/.test(p);
}
test('AD-02 quarantine tripwire rejects known reference paths',()=>{
  for(const p of ['Chess.apks','nested/BASE.APK','public/Chess_UIUX_Extracted_Assets.zip',
    'public/assets/apk-adoption/piece.png','src/assets/apk-adoption/sound.ogg',
    '.apk-quarantine/audio.fsb','Chess_Adoption_Readiness/spine/a.skel',
    'docs/Chess_AD02_Private_Provenance.csv','public/Chess_Extracted_Boards.png',
    'Chess_AD03_Private/dependency_edges.csv','public/Chess_AD03_Private_Manifest.zip'])
    assert.equal(prohibited(p),true,p);
  for(const p of ['docs/APK_ASSET_PROVENANCE.md','src/App.tsx','public/assets/asset-manifest.json',
    'public/assets/original/piece.svg','tests/apk-quarantine.test.mjs'])
    assert.equal(prohibited(p),false,p);
});
test('AD-02 tracked tree contains no reserved quarantine or adoption paths',()=>{
  const files=execFileSync('git',['ls-files','-z'],{encoding:'utf8',maxBuffer:16*1024*1024}).split('\0').filter(Boolean);
  assert.ok(files.length>0,'Git tracked tree required');
  assert.deepEqual(files.filter(prohibited),[],'Quarantined or not-yet-approved asset paths tracked');
});
