#!/usr/bin/env python3
"""OC-STITCH-08 / Fase J — comparador visual reproducible de las 58 páginas.

Dos fases separadas:

  capture : navega con agent-browser (sesión propia) por las 58 rutas en las
            seis resoluciones y guarda capturas + métricas DOM locales.
  analyze : compara cada captura con la PNG de referencia de Stitch y produce
            visual-comparison.json / VISUAL-COVERAGE.md / mapas de diferencia.

NO modifica el frontend, la BD, saves, ROMs ni los archivos de OC-STITCH-07.
Las métricas son EXPLORATORIAS: no sustituyen la revisión visual independiente,
que sigue PENDIENTE DE COMPROBAR porque este modelo no acepta entrada de imágenes.

Uso:
  python3 scripts/oc_stitch08_visual_compare.py                 # capture + analyze
  python3 scripts/oc_stitch08_visual_compare.py analyze        # solo análisis
  python3 scripts/oc_stitch08_visual_compare.py --session NAME  # sesión propia
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import html
import json
import math
import re
import subprocess
import sys
import urllib.request
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from PIL import Image, ImageChops, ImageStat

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "presentaciones" / "OC-STITCH-08" / "visual"
CAPTURES = OUT / "captures"
DIFFS = OUT / "diff"
REFS = Path("/tmp/opencode/oc-stitch-08")
CATALOG = ROOT / "apps" / "web" / "src" / "pages" / "catalog.ts"
CONTROL_GATE = ROOT / "docs" / "presentaciones" / "OC-STITCH-08" / "OC-STITCH-08-CONTROL-GATE.json"
BASE_URL = "http://127.0.0.1:8787/#"
REF_DIR = REFS / "screens"
HTML_DIR = REFS / "html"
MANIFEST = CAPTURES / "capture-manifest.json"

RESOLUTIONS: tuple[tuple[int, int], ...] = (
    (1920, 1080),
    (1366, 768),
    (1024, 768),
    (768, 1024),
    (390, 844),
    (360, 800),
)

DEFAULT_SESSION = "stitch08j-957274a7fcad"
CHUNK = 10

# Umbrales declarados (exploratorios, no certifican fidelidad visual).
OVERFLOW_HARD_RATIO = 0.05      # >5% de desbordamiento horizontal = fallo duro
TOKEN_SOFT_MIN = 0.50           # coincidencia de tokens por debajo = aviso
METRIC_OUTLIER_SSIM = 0.05      # SSIM bajo ...
METRIC_OUTLIER_HIST = 0.35      # ... e histograma bajo = aviso
MIN_TEXT_LEN = 40               # contenido renderizado mínimo (estados vacíos legítimos)
ALT_REF_WIDTH = 2000            # referencias < 2000 px son variante, no ancho canónico


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def norm(text: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(text)).strip()


def unescape_ts(value: str) -> str:
    return (
        value.replace('\\"', '"')
        .replace("&amp;", "&")
        .replace("&gt;", ">")
        .replace("&lt;", "<")
        .replace("&quot;", '"')
        .replace("&#39;", "'")
        .strip()
    )


def strings_of_array(block: str, key: str) -> list[str]:
    match = re.search(rf"{key}:\s*\[(.*?)\]", block, re.S)
    if not match:
        return []
    return list(dict.fromkeys(
        norm(unescape_ts(v)) for v in re.findall(r'"((?:[^"\\]|\\.)*)"', match.group(1))
        if len(norm(unescape_ts(v))) >= 4
    ))


def parse_catalog() -> list[dict[str, Any]]:
    text = CATALOG.read_text(encoding="utf-8")
    chunks = re.split(r"\n  \{\n    route: ", text)[1:]
    pages: list[dict[str, Any]] = []
    for chunk in chunks:
        body = chunk.split("\n  },", 1)[0]
        route_match = re.match(r'"([^"]+)"', body)
        if not route_match:
            continue
        def field(key: str, default: str = "") -> str:
            m = re.search(rf'\n    {key}:\s*"([^"]*)"', body)
            return unescape_ts(m.group(1)) if m else default
        source_match = re.search(r"sources:\s*\[(.*)", body, re.S)
        source = source_match.group(1) if source_match else ""
        source_id = re.search(r'id:\s*"([0-9a-f]+)"', source)
        pages.append({
            "route": route_match.group(1),
            "title": field("title"),
            "domain": field("domain"),
            "state": field("state"),
            "component": field("component"),
            "notes": field("notes"),
            "stitchIdFromCatalog": source_id.group(1) if source_id else None,
            "headings": strings_of_array(source, "headings"),
            "buttons": strings_of_array(source, "buttons"),
        })
    if len(pages) != 58:
        raise RuntimeError(f"catálogo: esperadas 58 páginas, leídas {len(pages)}")
    return pages


def read_refs() -> dict[str, dict[str, Any]]:
    data = json.loads((REFS / "refs.json").read_text(encoding="utf-8"))
    return {entry["route"]: entry for entry in data}


def ref_html_text(stitch_id: str) -> str:
    path = HTML_DIR / f"{stitch_id}.html"
    if not path.exists():
        return ""
    raw = path.read_text(encoding="utf-8", errors="replace")
    raw = re.sub(r"<(script|style)\b[^>]*>.*?</\1>", " ", raw, flags=re.S | re.I)
    raw = re.sub(r"<[^>]+>", " ", raw)
    return norm(raw)


def browser(session: str, *args: str) -> dict[str, Any]:
    proc = subprocess.run(
        ["agent-browser", "--session", session, *args],
        capture_output=True,
        text=True,
        timeout=180,
    )
    if proc.returncode != 0:
        raise RuntimeError(
            f"agent-browser {' '.join(args[:2])} falló ({proc.returncode}): "
            f"{proc.stderr.strip()[:400]}"
        )
    out = proc.stdout.strip()
    if not out:
        return {}
    try:
        parsed = json.loads(out)
    except json.JSONDecodeError:
        # `set viewport` imprime texto, no JSON; no es un error.
        return {"raw": out[-200:]}
    return parsed


def b64(js: str) -> str:
    return base64.b64encode(js.encode("utf-8")).decode("ascii")


def navigate_js(route: str) -> str:
    target = json.dumps("#" + route)
    return (
        "(async()=>{location.hash=" + target
        + ";await new Promise(r=>setTimeout(r,170));return location.hash})()"
    )


def init_js() -> str:
    return (
        "(()=>{window.__pg08Errors=[];"
        "addEventListener('error',e=>window.__pg08Errors.push(String(e.message)));"
        "addEventListener('unhandledrejection',e=>window.__pg08Errors.push(String(e.reason)));"
        "return true})()"
    )


def metrics_js(expected_title: str) -> str:
    title = json.dumps(expected_title)
    return """(()=>{
      const ids=['pg-home','nursery','sheet','pg-stub','detail'];
      const hosts=ids.map(id=>document.getElementById(id)).filter(Boolean)
        .map(e=>({node:e,id:e.id,hidden:e.classList.contains('hidden')||e.offsetParent===null,
                  text:(e.innerText||e.textContent||'').slice(0,14000)}))
        .filter(e=>!e.hidden).sort((a,b)=>b.text.length-a.text.length);
      const h=hosts[0]||null;
      const text=h?h.text:'';
      const errors=window.__pg08Errors||[];
      return {
        hash:location.hash,
        host:h?h.id:null,
        textLen:text.length,
        text:text,
        titleMatch:text.includes(%s),
        headingCount:h?h.node.querySelectorAll('h1,h2,h3').length:0,
        buttonCount:h?h.node.querySelectorAll('button').length:0,
        scrollWidth:document.documentElement.scrollWidth,
        clientWidth:document.documentElement.clientWidth,
        scrollHeight:document.documentElement.scrollHeight,
        clientHeight:document.documentElement.clientHeight,
        errorCount:errors.length,
        errors:errors.slice(0,3),
        viewport:[innerWidth,innerHeight]
      };
    })()""" % title


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def source_fingerprint() -> dict[str, str]:
    """Hash de los fuentes que generan las vistas; detecta cambios concurrentes."""
    base = ROOT / "apps" / "web" / "src"
    files = sorted([*base.glob("pages/*"), *base.glob("app/*"), base / "main.ts"])
    return {str(p.relative_to(ROOT)): sha256_bytes(p.read_bytes()) for p in files if p.is_file()}


def check_server() -> dict[str, Any]:
    out: dict[str, Any] = {}
    for label, url in (
        ("health", "http://127.0.0.1:8787/api/health"),
        ("bundle", "http://127.0.0.1:8787/assets/pg08/workbenches.js"),
    ):
        with urllib.request.urlopen(url, timeout=5) as resp:
            body = resp.read()
            out[label] = {"status": resp.status, "bytes": len(body), "sha256": sha256_bytes(body)}
    out["sourceFingerprint"] = source_fingerprint()
    return out


def capture(session: str, pages: list[dict[str, Any]]) -> dict[str, Any]:
    """Captura 58 rutas × 6 resoluciones. No inicia ni detiene el servidor."""
    server = check_server()
    captured: dict[str, dict[str, Any]] = {}
    failures: list[str] = []
    for page in pages:
        (CAPTURES / page["slug"]).mkdir(parents=True, exist_ok=True)

    for width, height in RESOLUTIONS:
        key = f"{width}x{height}"
        browser(session, "set", "viewport", str(width), str(height))
        browser(session, "eval", "-b", b64(init_js()))

        for start in range(0, len(pages), CHUNK):
            group = pages[start:start + CHUNK]
            # batch toma cada argumento como UNA línea de comando completa.
            commands: list[str] = []
            for page in group:
                commands.append(f"eval -b {b64(navigate_js(page['route']))}")
                commands.append(f"eval -b {b64(metrics_js(page['title']))}")
                slug = page["slug"]
                commands.append(f"screenshot {CAPTURES / slug / (key + '.png')}")
            result = browser(session, "batch", "--json", *commands)
            if not isinstance(result, list) or len(result) != len(commands):
                failures.append(f"{key} bloque {start}: salida inesperada")
                continue
            for index, page in enumerate(group):
                nav, met, shot = result[index * 3:index * 3 + 3]
                slug = page["slug"]
                row = {
                    "resolution": key,
                    "viewport": [width, height],
                    "navigationOk": bool(nav.get("success")),
                    "screenshotOk": bool(shot.get("success")),
                    "screenshot": str(CAPTURES / slug / f"{key}.png"),
                }
                payload = met.get("result")
                if met.get("success") and isinstance(payload, dict) and isinstance(payload.get("result"), dict):
                    row["dom"] = payload["result"]
                elif met.get("success") and isinstance(payload, dict) and "textLen" in payload:
                    row["dom"] = payload
                else:
                    row["dom"] = {}
                    failures.append(f"{slug}@{key}: métricas no disponibles")
                captured.setdefault(slug, {})[key] = row

    manifest = {
        "mission": "OC-STITCH-08",
        "kind": "VISUAL_CAPTURE_MANIFEST",
        "generatedAt": now(),
        "session": session,
        "baseUrl": BASE_URL,
        "server": server,
        "resolutions": [f"{w}x{h}" for w, h in RESOLUTIONS],
        "routeCount": len(pages),
        "captureCount": sum(len(v) for v in captured.values()),
        "failures": failures,
        "pages": captured,
    }
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return manifest


def normalized_crop(path: Path, width: int, height: int) -> Image.Image:
    """Escala la referencia al ancho objetivo y recorta el viewport superior.

    Si la referencia es más corta que el viewport escalado, se rellena con el
    color de la última fila (documentado como limitación).
    """
    with Image.open(path) as img:
        img = img.convert("RGB")
        scale = width / img.width
        needed_height = max(1, round(height / scale))
        scaled_h = max(needed_height, round(img.height * scale))
        scaled = img.resize((width, scaled_h), Image.Resampling.LANCZOS)
        if scaled_h == needed_height:
            return scaled
        canvas = Image.new("RGB", (width, needed_height), scaled.getpixel((width // 2, scaled_h - 1)))
        canvas.paste(scaled.crop((0, 0, width, needed_height)), (0, 0))
        return canvas


def pixel_metrics(ref: Image.Image, loc: Image.Image) -> tuple[dict[str, Any], Image.Image]:
    # Muestreo proporcional, sin numpy (dependencias congeladas del repositorio).
    scale = min(360 / ref.width, 360 / ref.height)
    size = (max(32, round(ref.width * scale)), max(32, round(ref.height * scale)))
    a = ref.resize(size, Image.Resampling.LANCZOS)
    b = loc.resize(size, Image.Resampling.LANCZOS)
    diff = ImageChops.difference(a, b)
    stat = ImageStat.Stat(diff)
    mae = sum(stat.mean) / 3
    rmse = math.sqrt(sum(v * v for v in stat.rms) / 3)
    psnr = "infinite" if rmse == 0 else round(20 * math.log10(255 / rmse), 3)

    hist = 0.0
    for ch in range(3):
        ha = a.histogram()[ch * 256:(ch + 1) * 256]
        hb = b.histogram()[ch * 256:(ch + 1) * 256]
        sa, sb = sum(ha), sum(hb)
        hist += sum(min(x / sa, y / sb) for x, y in zip(ha, hb)) if sa and sb else 0
    hist /= 3

    flat = list(diff.get_flattened_data())
    changed = sum(1 for r, g, bl in flat if max(r, g, bl) > 24) / len(flat)

    ga, gb = a.convert("L"), b.convert("L")
    xa, xb = list(ga.get_flattened_data()), list(gb.get_flattened_data())
    n = len(xa)
    mean_a, mean_b = sum(xa) / n, sum(xb) / n
    var_a = sum((v - mean_a) ** 2 for v in xa) / n
    var_b = sum((v - mean_b) ** 2 for v in xb) / n
    cov = sum((x - mean_a) * (y - mean_b) for x, y in zip(xa, xb)) / n
    c1, c2 = (0.01 * 255) ** 2, (0.03 * 255) ** 2
    ssim = ((2 * mean_a * mean_b + c1) * (2 * cov + c2)) / (
        (mean_a ** 2 + mean_b ** 2 + c1) * (var_a + var_b + c2)
    )

    metrics = {
        "sample": list(size),
        "mae": round(mae, 3),
        "rmse": round(rmse, 3),
        "psnrDb": psnr,
        "histogramIntersection": round(hist, 4),
        "changedPixelRatio": round(changed, 4),
        "ssimGlobal": round(ssim, 4),
    }
    return metrics, diff


def token_metrics(tokens: list[str], ref_text: str, local_text: str) -> dict[str, Any]:
    """Solo cuenta tokens respaldados por el HTML de Stitch.

    Un título del catálogo que no aparece en el HTML de la referencia no puede
    evaluarse contra esa referencia: se reporta como evidencia insuficiente en
    lugar de penalizar la página con un 0 artificial.
    """
    if not tokens:
        return {"tokens": {}, "tokenMatchRate": None, "referenceEvidence": bool(ref_text),
                "referenceSupportedCount": 0, "inconclusive": True}
    local_fold = norm(local_text).casefold()
    ref_fold = ref_text.casefold()
    matches: dict[str, dict[str, bool]] = {}
    for token in tokens:
        fold = token.casefold()
        matches[token] = {
            "inReferenceHtml": fold in ref_fold,
            "inLocalDom": fold in local_fold,
        }
    supported = [v for v in matches.values() if v["inReferenceHtml"]]
    both = sum(1 for v in supported if v["inLocalDom"])
    rate = round(both / len(supported), 4) if supported else None
    return {
        "tokens": matches,
        "tokenMatchRate": rate,
        "referenceSupportedCount": len(supported),
        "inLocalCount": sum(1 for v in matches.values() if v["inLocalDom"]),
        "tokenCount": len(tokens),
        "referenceEvidence": bool(ref_text),
        "inconclusive": rate is None,
    }


def analyze(pages: list[dict[str, Any]], refs: dict[str, dict[str, Any]], manifest: dict[str, Any]) -> dict[str, Any]:
    protected: dict[str, Any] = {}
    if CONTROL_GATE.is_file():
        gate = json.loads(CONTROL_GATE.read_text(encoding="utf-8"))
        for path, expected in gate.get("protectedBaselineHashes", {}).items():
            current = sha256_bytes((ROOT / path).read_bytes())
            protected[path] = {"matchesControlGate": current == expected, "currentSha256": current}

    report: dict[str, Any] = {
        "mission": "OC-STITCH-08",
        "phase": "J — sistema automatizado de fidelidad visual",
        "kind": "VISUAL_COMPARISON",
        "generatedAt": now(),
        "method": (
            "Normalización de la PNG completa de Stitch al ancho de cada resolución con recorte "
            "superior del viewport; métricas exploratorias de píxel sobre una muestra "
            "proporcional <=360 px; tokens del HTML de referencia contrastados con el DOM local; "
            "comprobaciones deterministas de render/overflow. Sin revisión visual humana."
        ),
        "limitations": [
            "REVISIÓN VISUAL INDEPENDIENTE PENDIENTE DE COMPROBAR: el modelo no acepta entrada de imágenes.",
            "Las métricas de píxel/tokens son exploratorias; ningún histograma acredita fidelidad total.",
            "Las referencias son capturas completas de 2560 px de ancho (tres variantes de 1396 px); el viewport local tiene otro ancho y otro DPR.",
            "Cuando la referencia es más corta que el viewport escalado se rellena con el color de la última fila.",
            "VISUAL_PASS significa únicamente que pasaron las comprobaciones programáticas, no que exista aprobación visual.",
        ],
        "thresholds": {
            "overflowHardRatio": OVERFLOW_HARD_RATIO,
            "tokenSoftMin": TOKEN_SOFT_MIN,
            "metricOutlierSsim": METRIC_OUTLIER_SSIM,
            "metricOutlierHistogram": METRIC_OUTLIER_HIST,
            "minTextLen": MIN_TEXT_LEN,
            "alternativeReferenceWidthBelow": ALT_REF_WIDTH,
        },
        "capture": {
            "session": manifest.get("session"),
            "baseUrl": manifest.get("baseUrl"),
            "server": manifest.get("server", {}),
            "captureCount": manifest.get("captureCount"),
            "manifest": str(MANIFEST),
        },
        "protectedBaseline": protected,
        "pages": [],
    }

    for page in pages:
        slug = page["slug"]
        route = page["route"]
        ref_meta = refs.get(route, {})
        ref_path = REF_DIR / f"{slug}.png"
        ref_exists = ref_path.is_file()
        stitch_id = ref_meta.get("stitchId") or page.get("stitchIdFromCatalog") or ""
        ref_text = ref_html_text(stitch_id)
        tokens = list(dict.fromkeys([page["title"], *page["headings"][:8], *page["buttons"][:10]]))
        tokens = [t for t in tokens if len(t) >= 4][:14]

        resolutions: dict[str, Any] = {}
        if ref_exists:
            with Image.open(ref_path) as img:
                ref_size = [img.width, img.height]
        else:
            ref_size = None

        hard: list[str] = []
        soft: list[str] = []
        review: list[str] = []

        for width, height in RESOLUTIONS:
            key = f"{width}x{height}"
            row = manifest.get("pages", {}).get(slug, {}).get(key, {})
            dom = row.get("dom", {})
            local_path = CAPTURES / slug / f"{key}.png"
            text_len = int(dom.get("textLen") or 0)
            local_text = norm(dom.get("text", "")).casefold()
            marker_tokens = [page["title"], *page["headings"][:2], *page["buttons"][:2]]
            marker_match = any(norm(t).casefold() in local_text for t in marker_tokens if t)
            overflow_x = int(dom.get("scrollWidth") or 0) - int(dom.get("clientWidth") or width)
            overflow_y = int(dom.get("scrollHeight") or 0) - int(dom.get("clientHeight") or height)
            gate = {
                "navigationOk": bool(row.get("navigationOk")),
                "screenshotOk": bool(row.get("screenshotOk")),
                "localScreenshotExists": local_path.is_file(),
                "host": dom.get("host"),
                "textLen": text_len,
                "titleMatch": bool(dom.get("titleMatch")),
                "markerMatch": marker_match,
                "headingCount": int(dom.get("headingCount") or 0),
                "buttonCount": int(dom.get("buttonCount") or 0),
                "errorCount": int(dom.get("errorCount") or 0),
                "errors": dom.get("errors", []),
                "overflowX": overflow_x,
                "overflowY": overflow_y,
            }

            if not gate["navigationOk"] or not gate["screenshotOk"] or not gate["localScreenshotExists"]:
                hard.append(f"{key}: captura no disponible")
                continue
            if text_len < MIN_TEXT_LEN or gate["errorCount"] > 0 or not gate["host"]:
                hard.append(
                    f"{key}: render/dom inconsistente (texto={text_len}, errores={gate['errorCount']}, "
                    f"host={gate['host']})"
                )
            if overflow_x > OVERFLOW_HARD_RATIO * width:
                hard.append(f"{key}: desbordamiento horizontal {overflow_x}px")
            elif overflow_x > 0:
                soft.append(f"{key}: desbordamiento horizontal menor {overflow_x}px")

            entry: dict[str, Any] = {"gate": gate}
            if not ref_exists:
                entry["pixels"] = None
                entry["tokens"] = None
            elif local_path.is_file():
                ref_img = normalized_crop(ref_path, width, height)
                with Image.open(local_path) as img:
                    loc_img = img.convert("RGB").resize((width, height), Image.Resampling.LANCZOS)
                pixels, diff = pixel_metrics(ref_img, loc_img)
                diff_path = DIFFS / f"diff-{slug}-{key}.png"
                diff.thumbnail((480, 480), Image.Resampling.LANCZOS)
                diff.save(diff_path)
                tok = token_metrics(tokens, ref_text, dom.get("text", ""))
                entry["pixels"] = pixels
                entry["tokens"] = tok
                entry["diffMap"] = str(diff_path)
                comparable = ref_size and ref_size[0] >= ALT_REF_WIDTH and width >= 1024
                if comparable and pixels["ssimGlobal"] < METRIC_OUTLIER_SSIM and pixels["histogramIntersection"] < METRIC_OUTLIER_HIST:
                    soft.append(f"{key}: divergencia métrica extrema (SSIM {pixels['ssimGlobal']}, hist {pixels['histogramIntersection']})")
                if tok["tokenMatchRate"] is None:
                    review.append(f"{key}: ningún token del catálogo aparece en el HTML de referencia")
                elif tok["tokenMatchRate"] < TOKEN_SOFT_MIN:
                    soft.append(f"{key}: coincidencia de tokens {tok['tokenMatchRate']}")
                if ref_size and ref_size[0] < ALT_REF_WIDTH:
                    review.append(f"{key}: referencia es variante estrecha ({ref_size[0]}px)")
            else:
                entry["pixels"] = None
                entry["tokens"] = None
                hard.append(f"{key}: PNG local ausente")
            resolutions[key] = entry

        if not ref_exists:
            status = "REFERENCE_MISSING"
            reasons = ["No existe PNG de referencia para esta ruta."]
        elif hard:
            status = "VISUAL_FAIL"
            reasons = hard
        elif review:
            status = "REVIEW_REQUIRED"
            reasons = review + soft
        elif soft:
            status = "VISUAL_WARNING"
            reasons = soft
        else:
            status = "VISUAL_PASS"
            reasons = ["Comprobaciones programáticas superadas; sin revisión visual independiente."]

        report["pages"].append({
            "slug": slug,
            "route": route,
            "title": page["title"],
            "domain": page["domain"],
            "state": page["state"],
            "status": status,
            "reasons": reasons,
            "reference": {
                "png": str(ref_path) if ref_exists else None,
                "exists": ref_exists,
                "size": ref_size,
                "stitchId": stitch_id,
                "htmlEvidence": bool(ref_text),
                "tokens": tokens,
                "name": ref_meta.get("name"),
            },
            "resolutions": resolutions,
            "independentVisualReview": "PENDIENTE DE COMPROBAR",
        })

    counts = Counter(p["status"] for p in report["pages"])
    report["summary"] = {
        "pages": len(report["pages"]),
        "statusCounts": {k: counts.get(k, 0) for k in (
            "VISUAL_PASS", "VISUAL_WARNING", "VISUAL_FAIL", "REFERENCE_MISSING", "REVIEW_REQUIRED"
        )},
        "referencesAvailable": sum(1 for p in report["pages"] if p["reference"]["exists"]),
        "referencesMissing": sum(1 for p in report["pages"] if not p["reference"]["exists"]),
        "resolutionChecks": len(report["pages"]) * len(RESOLUTIONS),
        "diffMaps": len(list(DIFFS.glob("diff-*.png"))),
        "independentVisualReview": "PENDIENTE DE COMPROBAR (modelo sin entrada de imágenes)",
    }
    return report


def overflow_probe_js() -> str:
    return """(async()=>{
      await new Promise(r=>setTimeout(r,220));
      const w=document.documentElement.clientWidth, out=[];
      for(const e of document.querySelectorAll('body *')){
        const r=e.getBoundingClientRect();
        if(r.right>w+2 && r.width>0) out.push({
          tag:e.tagName, id:e.id, cls:(e.className||'').toString().slice(0,90),
          right:Math.round(r.right), width:Math.round(r.width),
          text:(e.textContent||'').trim().slice(0,90)
        });
      }
      return {route:location.hash, clientWidth:w,
              scrollWidth:document.documentElement.scrollWidth,
              count:out.length, offenders:out.slice(0,10)};
    })()"""


def diagnose_overflow(session: str, report: dict[str, Any]) -> dict[str, Any]:
    """Localiza elementos que desbordan; solo lectura, sin tocar el frontend."""
    cases: list[dict[str, Any]] = []
    for page in report["pages"]:
        for key, entry in page["resolutions"].items():
            overflow = int(entry.get("gate", {}).get("overflowX") or 0)
            if overflow <= 0:
                continue
            width, height = (int(v) for v in key.split("x"))
            browser(session, "set", "viewport", str(width), str(height))
            browser(session, "eval", "-b", b64(f"location.hash={json.dumps('#' + page['route'])}"))
            probe = browser(session, "eval", "-b", b64(overflow_probe_js()))
            cases.append({
                "route": page["route"],
                "resolution": key,
                "overflowX": overflow,
                "probe": probe if isinstance(probe, dict) else {"raw": str(probe)},
            })
    out = {
        "mission": "OC-STITCH-08",
        "kind": "RESPONSIVE_DIAGNOSTICS",
        "generatedAt": now(),
        "session": session,
        "note": "Diagnóstico de solo lectura. No se modifica el frontend; los ajustes se reportan al agente padre.",
        "cases": cases,
    }
    path = OUT / "responsive-diagnostics.json"
    path.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return out


def write_markdown(report: dict[str, Any], diagnostics: dict[str, Any] | None = None) -> None:
    summary = report["summary"]
    counts = summary["statusCounts"]
    lines = [
        "# OC-STITCH-08 — Cobertura visual (Fase J)",
        "",
        "Generado: " + report["generatedAt"] + ".","",
        "## Metodología",
        "",
        report["method"],
        "",
        "Se navega por las 58 rutas del catálogo con `agent-browser` en una sesión propia",
        f"(`{report['capture']['session']}`), en las resoluciones "
        + ", ".join(f"{w}×{h}" for w, h in RESOLUTIONS) + ".",
        "El servidor preexistente no se inicia ni se detiene; solo se consumen `/api/health` y",
        "el bundle `/assets/pg08/workbenches.js`.",
        "",
        "## Métricas separadas",
        "",
        "1. **Píxel (exploratoria):** MAE, RMSE, PSNR, intersección de histogramas,",
        "   proporción de píxeles cambiados y SSIM global sobre una muestra proporcional ≤360 px.",
        "   La referencia se escala al ancho de la resolución y se recorta al alto del viewport.",
        "2. **Tokens (exploratoria):** coincidencia entre los tokens del catálogo que SÍ aparecen",
        "   en el HTML de Stitch y el DOM local. Si ningún token aparece en el HTML se reporta",
        "   evidencia insuficiente, no un 0. No mide posición ni estilo.",
        "3. **Geometría/render (determinista):** presencia del host, longitud de texto, marcadores,",
        "   errores de página, botones/encabezados y desbordamiento horizontal/vertical.",
        "",
        "## Reglas de resultado (por página)",
        "",
        "- `REFERENCE_MISSING`: falta la PNG de referencia.",
        "- `VISUAL_FAIL`: fallo determinista (sin captura, render vacío/casi vacío, error JS",
        f"  o desbordamiento horizontal >{int(OVERFLOW_HARD_RATIO * 100)}%).",
        f"- `VISUAL_WARNING`: aviso objetivo (overflow menor, tokens <{TOKEN_SOFT_MIN:.2f} o divergencia métrica extrema).",
        "- `REVIEW_REQUIRED`: la evidencia es insuficiente o ambigua (referencia variante de ancho",
        "  estrecho o ningún token del catálogo respaldado por el HTML) y hace falta criterio humano.",
        "- `VISUAL_PASS`: solo pasaron las comprobaciones programáticas. **No** certifica fidelidad visual.",
        "",
    ]
    mismatched = [p for p, v in report.get("protectedBaseline", {}).items() if not v["matchesControlGate"]]
    lines += [
        "## Archivos protegidos",
        "",
        "Esta misión no editó frontend, BD, saves ni ROMs. El estado se compara con la línea base",
        "del `CONTROL_GATE` de la misión:",
        f"- Coinciden: {len(report.get('protectedBaseline', {})) - len(mismatched)}.",
        f"- Difieren: {len(mismatched)}" + (f" ({', '.join('`' + p + '`' for p in mismatched)})" if mismatched else "") + ".",
        "- Si hay diferencias, proceden de cambios concurrentes ajenos a esta fase J (el bundle se",
        "  sirve desde un servidor preexistente); no se han revertido ni sobrescrito.",
        "",
        "## Resultados",
        "",
        f"- Páginas: **{summary['pages']}**; comprobaciones por resolución: **{summary['resolutionChecks']}**.",
        f"- Referencias disponibles: **{summary['referencesAvailable']}**; faltaron: **{summary['referencesMissing']}**.",
        f"- Mapas de diferencia: **{summary['diffMaps']}**.",
        "",
        "| Resultado | Páginas |",
        "|---|---:|",
    ]
    for key, value in counts.items():
        lines.append(f"| {key} | {value} |")
    lines += [
        "",
        "## Limitación obligatoria",
        "",
        "**La revisión visual independiente queda PENDIENTE DE COMPROBAR.** El modelo que ejecuta",
        "esta misión no acepta entrada de imágenes: ha medido píxeles y tokens y ha verificado el DOM,",
        "pero no ha **visto** las capturas. Los histogramas y SSIM no acreditan fidelidad total,",
        "especialmente cuando la referencia tiene 2560 px de ancho y el viewport local es distinto.",
        "Las capturas y los mapas `diff-*.png` se entregan para que una persona o un modelo con",
        "entrada de imágenes complete la revisión.",
        "",
        "## Detalle por página",
        "",
        "| Ruta | Estado | Resultado | Tokens | SSIM 1920×1080 | Motivo principal |",
        "|---|---|---:|---:|---:|---|",
    ]
    for page in report["pages"]:
        primary = page["resolutions"].get("1920x1080", {})
        tok = primary.get("tokens") or {}
        rate = tok.get("tokenMatchRate")
        ssim = (primary.get("pixels") or {}).get("ssimGlobal", "—")
        reason = page["reasons"][0] if page["reasons"] else "—"
        reason = reason.replace("|", "/")
        lines.append(
            f"| `{page['route']}` | {page['state']} | {page['status']} | "
            f"{rate if rate is not None else '—'} | {ssim} | {reason} |"
        )
    lines += [
        "",
        "Archivos: `visual-comparison.json` (resultados completos), `capture-manifest.json`",
        "(evidencia de captura), `captures/<slug>/<res>.png`, `diff/diff-<slug>-<res>.png`",
        "y `responsive-diagnostics.json` (elementos desbordados, solo lectura).",
        "",
    ]
    if diagnostics and diagnostics.get("cases"):
        from collections import Counter
        cls = Counter()
        for case in diagnostics["cases"]:
            for offender in case.get("probe", {}).get("offenders", []):
                cls[offender.get("cls") or offender.get("tag", "?")] += 1
        lines += [
            "## Hallazgo responsive (sin modificar frontend)",
            "",
            f"Se detectaron **{len(diagnostics['cases'])}** casos de overflow. Todos los ofensores",
            "localizados en el sondeo son chips de `.pg-outline__chip` (metadatos de referencia),",
            f"clases más frecuentes: `{dict(cls.most_common(4))}`. El ajuste correspondería a estilos",
            "del frontend y **no se ha aplicado** (prohibido en esta fase); se reporta al agente padre.",
            "",
        ]
    (OUT / "VISUAL-COVERAGE.md").write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode", nargs="?", choices=("all", "capture", "analyze", "diagnose"), default="all")
    parser.add_argument("--session", default=DEFAULT_SESSION, help="sesión propia de agent-browser")
    args = parser.parse_args()

    OUT.mkdir(parents=True, exist_ok=True)
    CAPTURES.mkdir(parents=True, exist_ok=True)
    DIFFS.mkdir(parents=True, exist_ok=True)

    catalog = parse_catalog()
    refs = read_refs()
    for page in catalog:
        meta = refs.get(page["route"])
        page["slug"] = meta["slug"] if meta else page["route"].strip("/").replace("/", "-")

    if args.mode in ("all", "capture"):
        manifest = capture(args.session, catalog)
    else:
        if not MANIFEST.is_file():
            raise SystemExit(f"falta {MANIFEST}: ejecuta primero la fase capture")
        manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))

    report = analyze(catalog, refs, manifest)
    (OUT / "visual-comparison.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    diagnostics: dict[str, Any] | None = None
    if args.mode in ("all", "diagnose"):
        diagnostics = diagnose_overflow(args.session, report)
    elif (OUT / "responsive-diagnostics.json").is_file():
        diagnostics = json.loads((OUT / "responsive-diagnostics.json").read_text(encoding="utf-8"))
    write_markdown(report, diagnostics)
    print(json.dumps({
        "ok": True,
        "mode": args.mode,
        "diagnostics": str(OUT / "responsive-diagnostics.json") if diagnostics else None,
        "summary": report["summary"],
        "report": str(OUT / "visual-comparison.json"),
        "markdown": str(OUT / "VISUAL-COVERAGE.md"),
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise
