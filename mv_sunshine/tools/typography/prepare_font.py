"""Repair the existing local Tencent font's sfnt directory without changing outlines."""
import argparse
import hashlib
import json
import math
import struct
from pathlib import Path


def checksum(data):
    data = bytes(data) + bytes((-len(data)) % 4)
    return sum(struct.unpack('>' + str(len(data) // 4) + 'I', data)) & 0xFFFFFFFF


def prepare(source, target):
    original = source.read_bytes()
    data = bytearray(original)
    count = struct.unpack_from('>H', data, 4)[0]
    entries = [list(struct.unpack_from('>4sIII', data, 12 + i * 16)) for i in range(count)]
    removed = [entry[0].decode() for entry in entries if not entry[3]]
    entries = sorted((entry for entry in entries if entry[3]), key=lambda entry: entry[0])
    total = len(entries)
    power = 2 ** int(math.log2(total))
    struct.pack_into('>HHHH', data, 4, total, power * 16, int(math.log2(power)), total * 16 - power * 16)
    data[12:12 + count * 16] = bytes(count * 16)
    head = next(entry for entry in entries if entry[0] == b'head')
    struct.pack_into('>I', data, head[2] + 8, 0)
    for i, entry in enumerate(entries):
        entry[1] = checksum(data[entry[2]:entry[2] + entry[3]])
        struct.pack_into('>4sIII', data, 12 + i * 16, *entry)
    struct.pack_into('>I', data, head[2] + 8, (0xB1B0AFBA - checksum(data)) & 0xFFFFFFFF)
    outlines = next(entry for entry in entries if entry[0] == b'glyf')
    start, end = outlines[2], outlines[2] + outlines[3]
    if data[start:end] != original[start:end]:
        raise ValueError('Glyph outlines changed')
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(data)
    return {'source': str(source), 'target': str(target), 'removedEmptyTables': removed,
            'outlineBytesUnchanged': True, 'bytes': len(data),
            'sourceSha256': hashlib.sha256(original).hexdigest(),
            'webSha256': hashlib.sha256(data).hexdigest()}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('target', type=Path)
    args = parser.parse_args()
    print(json.dumps(prepare(args.source, args.target), ensure_ascii=False, indent=2))
