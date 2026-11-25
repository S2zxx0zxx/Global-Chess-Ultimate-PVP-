#!/usr/bin/env python3
"""Read-only preflight for the observed single-stream FSB5 Vorbis source profile."""
import argparse
import csv
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import shutil
import struct
import subprocess
import tempfile
import zipfile
import zlib

PIN = 'd9875b1fff307e4759dfb85e49e3d5e6fb196f7c'
SETUPS = {'20591e7a': 4225, 'b6b3868b': 3832, '28f00387': 3484, 'd6e0bbd4': 3771}

def require(condition, message):
    if not condition:
        raise ValueError(message)

def inspect_bank(data):
    require(len(data) >= 68, 'truncated header')
    magic, version, count, headers, names, payload, codec = struct.unpack_from('<4s6I', data)
    require((magic, version, count, codec) == (b'FSB5', 1, 1, 15), 'unsupported FSB profile')
    end = 60 + headers
    start = end + names
    require(end >= 68 and start + payload == len(data), 'bank size mismatch')
    mode = struct.unpack_from('<Q', data, 60)[0]
    require((mode >> 7) & 0x7ffffff == 0, 'unexpected data offset')
    require((mode >> 1) & 15 == 8 and (mode >> 5) & 3 in (0, 1), 'unsupported rate/channels')
    samples = mode >> 34
    require(samples > 0, 'empty sample')
    channels = 1 + ((mode >> 5) & 3)
    p, more, setup = 68, mode & 1, None
    while more:
        require(p + 4 <= end, 'truncated extra header')
        flag = struct.unpack_from('<I', data, p)[0]
        p += 4
        more, size, kind = flag & 1, (flag >> 1) & 0xffffff, flag >> 25
        require(p + size <= end, 'truncated extra data')
        require(kind == 11 and setup is None and size >= 8, 'unexpected extra flag')
        ident, seek = struct.unpack_from('<II', data, p)
        setup = f'{ident:08x}'
        require(seek == size - 8, 'seek table length mismatch')
        p += size
    require(setup in SETUPS and not any(data[p:end]), 'unknown setup or header padding')
    p, packets = start, 0
    while p + 2 <= len(data):
        size = struct.unpack_from('<H', data, p)[0]
        if size in (0, 65535):
            break
        p += 2
        require(p + size <= len(data), 'packet exceeds bank')
        p += size
        packets += 1
    require(packets > 0 and not any(data[p:]), 'invalid packet padding')
    return dict(setup_id=setup, rate=44100, channels=channels, samples=samples, packets=packets,
                padding_bytes=len(data)-p, sha256=hashlib.sha256(data).hexdigest())

def check_codebooks(path):
    source = path.read_text(encoding='utf-8')
    for ident, length in SETUPS.items():
        match = re.search(r'static const uint8_t vcb_'+ident+r'\[\]\s*=\s*\{(.*?)\};', source, re.S)
        require(match is not None, 'missing codebook '+ident)
        data = bytes(int(x, 16) for x in re.findall(r'0x([0-9a-fA-F]{2})\b', match[1]))
        require(len(data) == length and data.startswith(b'\x05vorbis') and f'{zlib.crc32(data):08x}' == ident, 'invalid codebook '+ident)
    return True

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('archive', type=Path)
    parser.add_argument('manifest', type=Path, help='AD-03 audio_manifest.csv')
    parser.add_argument('--codebooks', type=Path, help='pinned upstream vorbis_codebooks_fsb.h')
    parser.add_argument('--decoder', type=Path, help='trusted local vgmstream-cli executable; metadata probe only')
    args = parser.parse_args()
    with args.manifest.open(encoding='utf-8', newline='') as f:
        records = list(csv.DictReader(f))
    expected = {r['file']:r['sha256'] for r in records}
    require(len(records) == len(expected) == 44, 'expected 44 distinct manifest paths')
    if args.codebooks:
        check_codebooks(args.codebooks)
    decoder = args.decoder.resolve(strict=True) if args.decoder else None
    output = []
    with zipfile.ZipFile(args.archive) as z, tempfile.TemporaryDirectory(prefix='ad04-') as tmp:
        members = [i for i in z.infolist() if i.filename.startswith('audio_raw/') and i.filename.endswith('.fsb')]
        require(len(members) == 44 and {i.filename for i in members} == expected.keys(), 'bank set differs from manifest')
        for i in sorted(members, key=lambda v:v.filename):
            require(i.file_size <= 16*1024*1024, 'bank exceeds size cap')
            data = z.read(i)
            info = inspect_bank(data)
            require(info['sha256'] == expected[i.filename], 'hash mismatch '+i.filename)
            info['file'] = i.filename
            info['decoder_probe'] = 'not_run'
            if decoder:
                p = Path(tmp) / PurePosixPath(i.filename).name
                p.write_bytes(data)
                proc = subprocess.run([str(decoder), '-m', str(p)], capture_output=True, text=True, timeout=60, check=False)
                info['decoder_probe'] = 'exit_zero' if proc.returncode == 0 else 'failed'
                info['decoder_output'] = (proc.stdout + proc.stderr)[:8000]
                p.unlink()
            output.append(info)
    print(json.dumps({'pin':PIN, 'codebooks_checked':bool(args.codebooks), 'decoder_sha256':hashlib.sha256(decoder.read_bytes()).hexdigest() if decoder else None, 'banks':output}, indent=2))
    if any(r['decoder_probe']=='failed' for r in output):
        raise SystemExit(1)

if __name__ == '__main__':
    main()
