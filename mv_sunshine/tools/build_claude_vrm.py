#!/usr/bin/env python3
"""
Builds `mv_sunshine/assets/claude_chan.vrm` ("Claude · 橙发的阅读者") for local non-commercial MV preview:
- Strips whale tail (`Spring_60_whale_tail`), maid headband, and whale ear-fins via index-buffer filtering
  (preserving 100% of node indices, vertex indices, 23 facial morph targets, and VRMC_springBone chains!).
- Re-authors textures to match ZipZipPipe / hihihihi202's humanoid Claude design:
  * Warm Persimmon-Terracotta Orange long wavy hair (`#DC6C32` / `#F7A968` highlights)
  * Warm Golden-Amber Ochre irises (`#DF8E36`)
  * Warm Ivory-Cream ruffled Victorian blouse, Deep Charcoal-Espresso gold-buttoned corset & side overskirts,
    Terracotta-Orange waist sash ribbons, and warm ivory/brown boots.
"""
import io
import json
import os
import struct
import numpy as np
from PIL import Image

SRC_VRM = "/Users/weckham/Desktop/科技峰会重要访谈/资料/阿陈AI小镇源码核对_2026-11-16/技术拆解/人物模型预览/assets/models/deepseek.vrm"
OUT_VRM = "/Users/weckham/Desktop/MUSIC/petalwake/mv_sunshine/assets/claude_chan.vrm"


def read_glb(path):
    with open(path, "rb") as f:
        magic, version, total = struct.unpack("<4sII", f.read(12))
        assert magic == b"glTF"
        j_len, j_type = struct.unpack("<I4s", f.read(8))
        gltf = json.loads(f.read(j_len).decode("utf-8"))
        b_len, b_type = struct.unpack("<I4s", f.read(8))
        blob = bytearray(f.read(b_len))
    return gltf, blob


def read_acc(gltf, blob, idx):
    a = gltf["accessors"][idx]
    bv = gltf["bufferViews"][a["bufferView"]]
    off = bv.get("byteOffset", 0) + a.get("byteOffset", 0)
    n_comp = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}[a["type"]]
    dt = {5126: np.float32, 5123: np.uint16, 5125: np.uint32}[a["componentType"]]
    arr = np.frombuffer(blob, dtype=dt, count=a["count"] * n_comp, offset=off)
    return arr.reshape(-1, n_comp).copy()


def recolor_hair_to_claude_orange(im: Image.Image) -> Image.Image:
    """Blue/cyan painterly hair -> rich sunlit terracotta-persimmon orange (#DC6C32) keeping strand highlights."""
    arr = np.asarray(im.resize((2048, 2048), Image.Resampling.LANCZOS), dtype=np.float32) / 255.0
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
    # Perceived tonal brightness along original blue-cyan gradient
    lum = np.clip(0.14 * r + 0.44 * g + 0.42 * b, 0.0, 1.0)
    # Three-stop painterly ramp: deep warm burnt sienna -> terracotta orange -> sunlit honey-apricot highlight
    c_dark = np.array([0.36, 0.11, 0.05], dtype=np.float32)
    c_mid = np.array([0.86, 0.40, 0.18], dtype=np.float32)
    c_hi = np.array([0.99, 0.72, 0.44], dtype=np.float32)

    t1 = np.clip(lum / 0.42, 0.0, 1.0)[..., None]
    t2 = np.clip((lum - 0.42) / 0.58, 0.0, 1.0)[..., None]
    out = np.where(lum[..., None] < 0.42, c_dark * (1 - t1) + c_mid * t1, c_mid * (1 - t2) + c_hi * t2)
    out = np.clip(out * 255.0, 0, 255).astype(np.uint8)
    return Image.fromarray(out, mode="RGB")


def recolor_head_amber_eyes(im: Image.Image) -> Image.Image:
    """Shift blue iris pixels to Claude's warm golden-amber eyes, warm up skin slightly."""
    arr = np.asarray(im.resize((2048, 2048), Image.Resampling.LANCZOS), dtype=np.float32)
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
    blue_dom = (b - r > 18.0) & (b > 45.0)

    lum = (0.18 * r + 0.45 * g + 0.37 * b) / 255.0
    # Golden-amber iris ramp
    amb_r = np.clip((0.45 + 0.65 * lum) * 255.0, 0, 255)
    amb_g = np.clip((0.22 + 0.54 * lum) * 255.0, 0, 255)
    amb_b = np.clip((0.06 + 0.26 * lum) * 255.0, 0, 255)

    blend = np.clip((b - r - 14.0) / 36.0, 0.0, 1.0) * blue_dom
    out_r = r * (1 - blend) + amb_r * blend
    out_g = g * (1 - blend) + amb_g * blend
    out_b = b * (1 - blend) + amb_b * blend

    # Very subtle sunlit warmth on skin/whites so cool lavender shadows become warm cream
    cool_white = (b > r) & (r > 150)
    cw = np.clip((b - r) / 40.0, 0.0, 1.0) * cool_white
    out_r = out_r + cw * 10.0
    out_b = out_b - cw * 14.0

    out = np.stack([out_r, out_g, out_b], axis=-1)
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), mode="RGB")


def recolor_upper_dress(im: Image.Image) -> Image.Image:
    """
    Upper bodice & sleeves:
    - Dark navy corset/collar ribbon -> Deep Charcoal-Espresso (#24201E)
    - Cyan gems/accents -> Claude Terracotta-Orange (#E27035)
    - Cool lavender-white ruffled blouse & bishop sleeves -> Warm Sunlit Ivory-Cream (#FAF1E2)
    - Skin regions (R > B + 15) untouched!
    """
    arr = np.asarray(im.resize((2048, 2048), Image.Resampling.LANCZOS), dtype=np.float32)
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
    out = arr.copy()

    # 1. Cyan accents -> Terracotta-gold
    cyan_mask = (g > 130) & (b > 150) & (b - r > 55)
    lum_c = (0.2 * r + 0.5 * g + 0.3 * b) / 255.0
    out[cyan_mask, 0] = np.clip(lum_c[cyan_mask] * 285.0 + 40.0, 0, 255)
    out[cyan_mask, 1] = np.clip(lum_c[cyan_mask] * 155.0 + 18.0, 0, 255)
    out[cyan_mask, 2] = np.clip(lum_c[cyan_mask] * 75.0 + 8.0, 0, 255)

    # 2. Dark/mid navy cloth -> Espresso-charcoal corset + subtle warm brown-black sheen
    navy_mask = (~cyan_mask) & (b - r > 14) & (b < 175)
    lum_n = (0.22 * r + 0.38 * g + 0.40 * b) / 255.0
    # Mid-bright blue trims become warm terracotta-orange accents; dark navy becomes charcoal-espresso
    mid_blue = navy_mask & (lum_n > 0.34) & (b - r > 38)
    dark_navy = navy_mask & (~mid_blue)

    out[dark_navy, 0] = np.clip(lum_n[dark_navy] * 172.0 + 36.0, 0, 255)
    out[dark_navy, 1] = np.clip(lum_n[dark_navy] * 138.0 + 27.0, 0, 255)
    out[dark_navy, 2] = np.clip(lum_n[dark_navy] * 120.0 + 23.0, 0, 255)

    out[mid_blue, 0] = np.clip(lum_n[mid_blue] * 255.0 + 42.0, 0, 255)
    out[mid_blue, 1] = np.clip(lum_n[mid_blue] * 135.0 + 16.0, 0, 255)
    out[mid_blue, 2] = np.clip(lum_n[mid_blue] * 68.0 + 10.0, 0, 255)

    # 3. Cool white/lavender ruffles -> Warm Sunlit Ivory-Cream (#FAF1E2)
    white_mask = (~cyan_mask) & (~navy_mask) & (r > 135) & (b >= r - 8)
    lum_w = (0.30 * r + 0.42 * g + 0.28 * b) / 255.0
    out[white_mask, 0] = np.clip(lum_w[white_mask] * 256.0 + 6.0, 0, 255)
    out[white_mask, 1] = np.clip(lum_w[white_mask] * 244.0 + 2.0, 0, 255)
    out[white_mask, 2] = np.clip(lum_w[white_mask] * 222.0 - 4.0, 0, 255)

    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), mode="RGB")


def recolor_lower_skirt(im: Image.Image) -> Image.Image:
    """
    Lower ankle-length skirt & boots:
    - Erase tiny blue whale icon on apron (replace with warm ivory cloth)
    - Dark-navy gold-embroidered side overskirt -> Deep Charcoal-Espresso (keeping gold embroidery untouched!)
    - Royal-blue inner skirt panels -> Claude Terracotta-Orange (#DA6A30)
    - Cool white apron & under-ruffles -> Warm Ivory-Cream (#FAF1E2)
    """
    arr = np.asarray(im.resize((2048, 2048), Image.Resampling.LANCZOS), dtype=np.float32)
    H, W = arr.shape[:2]
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
    out = arr.copy()

    # Seamlessly erase ONLY the tiny blue whale icon inside the white apron ([y: 0.160..0.192, x: 0.422..0.466])
    # without touching adjacent pleats or dark UV islands!
    y0, y1 = int(0.160 * H), int(0.192 * H)
    x0, x1 = int(0.422 * W), int(0.466 * W)
    whale_zone = out[y0:y1, x0:x1, :].copy()
    clean_apron_mask = (whale_zone[..., 0] > 218.0) & (whale_zone[..., 2] - whale_zone[..., 0] < 14.0)
    apron_fill_rgb = np.median(whale_zone[clean_apron_mask], axis=0)
    is_logo = (whale_zone[..., 2] - whale_zone[..., 0] > 14.0) | (whale_zone[..., 0] < 216.0)
    whale_zone[is_logo] = apron_fill_rgb
    out[y0:y1, x0:x1, :] = whale_zone

    r, g, b = out[..., 0], out[..., 1], out[..., 2]
    # Gold embroidery pixels have R > B + 12 -> automatically preserved!
    blue_cloth = (b - r > 14) & (b < 210)
    lum = (0.20 * r + 0.40 * g + 0.40 * b) / 255.0

    # Brighter royal-blue panels -> Claude Terracotta-Orange!
    terracotta_panel = blue_cloth & (lum > 0.27) & (b - r > 35)
    # Deep navy pleated overskirt -> Espresso-Charcoal!
    charcoal_pleats = blue_cloth & (~terracotta_panel)

    out[terracotta_panel, 0] = np.clip(lum[terracotta_panel] * 265.0 + 42.0, 0, 255)
    out[terracotta_panel, 1] = np.clip(lum[terracotta_panel] * 132.0 + 16.0, 0, 255)
    out[terracotta_panel, 2] = np.clip(lum[terracotta_panel] * 64.0 + 10.0, 0, 255)

    out[charcoal_pleats, 0] = np.clip(lum[charcoal_pleats] * 175.0 + 36.0, 0, 255)
    out[charcoal_pleats, 1] = np.clip(lum[charcoal_pleats] * 140.0 + 27.0, 0, 255)
    out[charcoal_pleats, 2] = np.clip(lum[charcoal_pleats] * 122.0 + 23.0, 0, 255)

    # Cool white/lavender apron & pleated hem -> Warm Ivory-Cream
    white_cloth = (~blue_cloth) & (r > 125) & (b >= r - 8)
    lum_w = (0.30 * r + 0.42 * g + 0.28 * b) / 255.0
    out[white_cloth, 0] = np.clip(lum_w[white_cloth] * 256.0 + 6.0, 0, 255)
    out[white_cloth, 1] = np.clip(lum_w[white_cloth] * 243.0 + 2.0, 0, 255)
    out[white_cloth, 2] = np.clip(lum_w[white_cloth] * 220.0 - 5.0, 0, 255)

    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), mode="RGB")


def recolor_waist_sash(im: Image.Image) -> Image.Image:
    """Front waist ribbon bow & long hanging tails -> Rich Claude Terracotta-Orange silk (#DC6B31)."""
    arr = np.asarray(im.resize((1024, 1024), Image.Resampling.LANCZOS), dtype=np.float32) / 255.0
    lum = np.clip(0.30 * arr[..., 0] + 0.42 * arr[..., 1] + 0.28 * arr[..., 2], 0.0, 1.0)
    # Map shaded white silk folds -> warm terracotta-orange silk folds!
    out_r = np.clip(0.32 + 0.64 * lum, 0.0, 1.0)
    out_g = np.clip(0.11 + 0.36 * lum, 0.0, 1.0)
    out_b = np.clip(0.05 + 0.17 * lum, 0.0, 1.0)
    out = np.stack([out_r, out_g, out_b], axis=-1) * 255.0
    return Image.fromarray(out.astype(np.uint8), mode="RGB")


def filter_head_and_tail_geometry(gltf, blob, head_img_orig: np.ndarray):
    """
    1. Collapse `Spring_60_whale_tail` (mesh 61) indices to degenerate triangles so whale tail disappears
       without shifting any node/mesh/bufferView layout.
    2. Filter `Head` (mesh 2, prim 0) index buffer to drop Maid Headband & Left/Right Whale Ear-Fins
       while keeping 100% of face, human ears, eyes, lashes, brows, and all 23 morph targets untouched!
    """
    # 1. Hide whale tail (mesh 61)
    pr_tail = gltf["meshes"][61]["primitives"][0]
    iacc_t = gltf["accessors"][pr_tail["indices"]]
    ibv_t = gltf["bufferViews"][iacc_t["bufferView"]]
    ioff_t = ibv_t.get("byteOffset", 0) + iacc_t.get("byteOffset", 0)
    dt_t = np.uint16 if iacc_t["componentType"] == 5123 else np.uint32
    nbytes_t = iacc_t["count"] * np.dtype(dt_t).itemsize
    blob[ioff_t : ioff_t + nbytes_t] = bytes(nbytes_t)

    # 2. Filter Head prim 0 triangles
    pr_head = gltf["meshes"][2]["primitives"][0]
    pos = read_acc(gltf, blob, pr_head["attributes"]["POSITION"])
    uv = read_acc(gltf, blob, pr_head["attributes"]["TEXCOORD_0"])
    iacc = gltf["accessors"][pr_head["indices"]]
    ibv = gltf["bufferViews"][iacc["bufferView"]]
    ioff = ibv.get("byteOffset", 0) + iacc.get("byteOffset", 0)
    dt = np.uint16 if iacc["componentType"] == 5123 else np.uint32
    tris = np.frombuffer(blob, dtype=dt, count=iacc["count"], offset=ioff).reshape(-1, 3).copy()

    H, W = head_img_orig.shape[:2]
    quant = np.round(pos * 5000).astype(np.int64)
    _, v_canon = np.unique(quant, axis=0, return_inverse=True)
    parent = np.arange(len(pos))

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    for a, b, c in tris:
        ra, rb, rc = find(v_canon[a]), find(v_canon[b]), find(v_canon[c])
        parent[rb] = ra
        parent[rc] = ra

    comp = np.array([find(v_canon[t[0]]) for t in tris])

    # Identify headband & hairpin components (mean Y_max > 1.62 or blue ornament x > 0.10)
    drop_comps = set()
    for cid in np.unique(comp):
        mask = comp == cid
        vs = np.unique(tris[mask])
        mn, mx = pos[vs].min(0), pos[vs].max(0)
        px = np.clip((uv[vs, 0] % 1.0 * (W - 1)).astype(int), 0, W - 1)
        py = np.clip((uv[vs, 1] % 1.0 * (H - 1)).astype(int), 0, H - 1)
        rgb = head_img_orig[py, px].mean(0)
        # Maid headband reaches y > 1.62 with cool white/lavender RGB; blue ornament has B - R > 80
        if mx[1] > 1.62 or (rgb[2] - rgb[0] > 70 and mn[0] > 0.09):
            drop_comps.add(cid)

    # Also drop whale ear-fin triangles attached to the side of the head (|x| > 0.084 and non-skin UV color B >= R - 5)
    tri_pts = pos[tris]  # (T, 3, 3)
    tri_x_abs = np.abs(tri_pts[:, :, 0]).max(axis=1)
    tri_uv = uv[tris].mean(axis=1)
    tpx = np.clip((tri_uv[:, 0] % 1.0 * (W - 1)).astype(int), 0, W - 1)
    tpy = np.clip((tri_uv[:, 1] % 1.0 * (H - 1)).astype(int), 0, H - 1)
    tri_rgb = head_img_orig[tpy, tpx]
    ear_fin_tri = (tri_x_abs > 0.082) & (tri_rgb[:, 2] >= tri_rgb[:, 0] - 5.0)

    keep_mask = (~np.isin(comp, list(drop_comps))) & (~ear_fin_tri)
    kept_tris = tris[keep_mask]
    removed = len(tris) - len(kept_tris)
    print(f"[build_claude] Stripped {removed} maid-headband & whale-fin triangles from Head (kept {len(kept_tris)}).")

    # Overwrite index buffer in-place (pad remainder with degenerate 0,0,0 triangles)
    padded = np.zeros_like(tris)
    padded[: len(kept_tris)] = kept_tris
    raw_bytes = padded.astype(dt).tobytes()
    blob[ioff : ioff + len(raw_bytes)] = raw_bytes


def rebuild_glb_with_new_images(gltf, blob, new_png_bytes_by_idx):
    """Re-pack bufferViews so replaced PNG textures fit cleanly with 4-byte GLB alignment."""
    img_bvs = {img["bufferView"]: i for i, img in enumerate(gltf["images"])}
    new_blob = bytearray()

    for bvi, bv in enumerate(gltf["bufferViews"]):
        old_off = bv.get("byteOffset", 0)
        old_len = bv["byteLength"]
        if bvi in img_bvs and img_bvs[bvi] in new_png_bytes_by_idx:
            chunk = new_png_bytes_by_idx[img_bvs[bvi]]
        else:
            chunk = bytes(blob[old_off : old_off + old_len])

        # Align start to 4 bytes
        while len(new_blob) % 4 != 0:
            new_blob.append(0)
        bv["byteOffset"] = len(new_blob)
        bv["byteLength"] = len(chunk)
        new_blob.extend(chunk)

    while len(new_blob) % 4 != 0:
        new_blob.append(0)
    gltf["buffers"][0]["byteLength"] = len(new_blob)

    json_bytes = json.dumps(gltf, separators=(",", ":")).encode("utf-8")
    while len(json_bytes) % 4 != 0:
        json_bytes += b" "

    total_len = 12 + 8 + len(json_bytes) + 8 + len(new_blob)
    os.makedirs(os.path.dirname(OUT_VRM), exist_ok=True)
    with open(OUT_VRM, "wb") as f:
        f.write(struct.pack("<4sII", b"glTF", 2, total_len))
        f.write(struct.pack("<I4s", len(json_bytes), b"JSON"))
        f.write(json_bytes)
        f.write(struct.pack("<I4s", len(new_blob), b"BIN\x00"))
        f.write(new_blob)
    print(f"[build_claude] Wrote {OUT_VRM} ({total_len / (1024*1024):.2f} MB)")


def main():
    gltf, blob = read_glb(SRC_VRM)

    # Extract original images
    orig_pil = {}
    for i, img in enumerate(gltf["images"]):
        bv = gltf["bufferViews"][img["bufferView"]]
        off = bv.get("byteOffset", 0)
        orig_pil[i] = Image.open(io.BytesIO(blob[off : off + bv["byteLength"]])).convert("RGB" if i < 6 else "RGBA")

    head_np = np.asarray(orig_pil[5])
    filter_head_and_tail_geometry(gltf, blob, head_np)

    # Transform textures to Claude ("橙发的阅读者")
    transformed = {
        0: recolor_upper_dress(orig_pil[0]),
        1: recolor_lower_skirt(orig_pil[1]),
        2: recolor_waist_sash(orig_pil[2]),
        3: orig_pil[3].resize((1024, 1024), Image.Resampling.LANCZOS),
        4: recolor_hair_to_claude_orange(orig_pil[4]),
        5: recolor_head_amber_eyes(orig_pil[5]),
    }

    encoded = {}
    for idx, pil_im in transformed.items():
        buf = io.BytesIO()
        pil_im.save(buf, format="PNG", optimize=False, compress_level=4)
        encoded[idx] = buf.getvalue()

    rebuild_glb_with_new_images(gltf, blob, encoded)


if __name__ == "__main__":
    main()
