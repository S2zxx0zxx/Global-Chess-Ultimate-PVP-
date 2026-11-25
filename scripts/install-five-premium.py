"""Install only the four exact approved FBX assets from the user's companion ZIP.
No network, no third-party dependency, no credentials. Run at repository root.
"""
import hashlib, pathlib, sys, zipfile, tempfile, os, json
ROOT=pathlib.Path(__file__).resolve().parents[1]
BASE=ROOT/'public/assets/five-resource'
EXPECTED={
 'premium-low.fbx': (1150140,'83846babcf10e1b4aff60c551a917ee5dfd876f89124cef37a959076f84d7c9e'),
 'premium-low-fantasy.fbx': (1454780,'bc1cc69af39af7169d80407f1883d0bddc1931d47d751fdec428483984834c85'),
 'premium-high.fbx': (22301484,'83602629e365f682f06657ab25873164bcd198d7e85adb8dfc8b9132673da819'),
 'premium-high-fantasy.fbx': (31537900,'79a6376d551e6dfe1ba02044f75201910e42faede439a4effedddcb5e3912c33'),
}
if len(sys.argv)!=2: raise SystemExit('Usage: python scripts/install-five-premium.py <companion ZIP path>')
archive=pathlib.Path(sys.argv[1]).expanduser().resolve()
if not (ROOT/'src/ChessBoard3D.tsx').is_file(): raise SystemExit('Wrong checkout')
with zipfile.ZipFile(archive) as z:
    with tempfile.TemporaryDirectory(prefix='gcu-five-') as tmp:
        staged=pathlib.Path(tmp)
        for name,(size,sha) in EXPECTED.items():
            source='public/assets/five-resource/'+name
            matches=[x for x in z.infolist() if x.filename==source]
            if len(matches)!=1 or matches[0].file_size!=size: raise ValueError('Missing, duplicate, or wrong-size '+source)
            data=z.read(matches[0])
            if len(data)!=size or hashlib.sha256(data).hexdigest()!=sha: raise ValueError('Wrong original SHA-256 '+source)
            (staged/name).write_bytes(data)
        # Validate all four before touching the checkout; reject conflicting existing bytes.
        for name,(_,sha) in EXPECTED.items():
            dest=BASE/name
            if dest.exists() and hashlib.sha256(dest.read_bytes()).hexdigest()!=sha: raise ValueError('Conflicting destination: '+str(dest))
        BASE.mkdir(parents=True,exist_ok=True)
        for name in EXPECTED:
            target=BASE/name
            if not target.exists():
                with tempfile.NamedTemporaryFile(dir=BASE,delete=False) as out:
                    temp=pathlib.Path(out.name);out.write((staged/name).read_bytes())
                os.replace(temp,target)
            print('Verified',name,EXPECTED[name][0],EXPECTED[name][1])
        # Generate bounded attribution and manifest rather than extracting arbitrary paths.
        (BASE/'NOTICE.txt').write_text('Georgez05 - 3D Chess Set Asset Pack. Author permits use; credits appreciated. https://georgez05.itch.io/chess-pack-high-and-low-poly\n',encoding='utf8')
        (BASE/'manifest.json').write_text(json.dumps({'creator':'Georgez05','source':'https://georgez05.itch.io/chess-pack-high-and-low-poly','files':[{'path':'public/assets/five-resource/'+n,'bytes':s,'sha256':h} for n,(s,h) in EXPECTED.items()]},indent=2)+'\n',encoding='utf8')
print('All four original assets installed. Next: npm run assets:verify:five; npm run verify; node scripts/five-resource-browser.mjs --premium')
