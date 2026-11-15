"""Genera la versión liviana para publicar: saca CSS sin uso, minifica CSS/JS/HTML. No cambia lo que se ve.
Uso (desde la raíz del proyecto):  python landing-html/optimizar.py
Lee  public/lp/preview-es.html  (fuente legible, la que se edita)
Escribe public/lp/index.html     (la que se publica en skillio.digital)
Las rutas relativas img/... pasan a /lp/img/... porque la página se sirve en "/"."""
import re, pathlib
LP = pathlib.Path(__file__).resolve().parent.parent / "public" / "lp"
src = (LP / "preview-es.html").read_text(encoding="utf-8")

# clases e ids en uso (atributos + cualquier palabra dentro de los <script>)
used = set()
for m in re.finditer(r'class="([^"]*)"', src): used.update(m.group(1).split())
used.update(re.findall(r'id="([^"]+)"', src))
for sc in re.findall(r"<script[^>]*>(.*?)</script>", src, re.S): used.update(re.findall(r"[A-Za-z_][\w-]*", sc))

def split_blocks(css):
    out, i, n = [], 0, len(css)
    while i < n:
        j = css.find("{", i)
        if j < 0: break
        sel = css[i:j].strip(); depth, k = 1, j + 1
        while depth and k < n:
            if css[k] == "{": depth += 1
            elif css[k] == "}": depth -= 1
            k += 1
        out.append((sel, css[j + 1:k - 1])); i = k
    return out

def keep_sel(sel):
    for part in sel.split(","):
        names = re.findall(r"[.#]([A-Za-z_][\w-]*)", re.sub(r":not\([^)]*\)|::?[\w-]+(\([^)]*\))?", "", part))
        if all(nm in used for nm in names): return True
    return False

def purge(css):
    res = []
    for sel, body in split_blocks(css):
        if sel.startswith("@media") or sel.startswith("@supports"):
            inner = purge(body)
            if inner.strip(): res.append(sel + "{" + inner + "}")
        elif sel.startswith("@") or keep_sel(sel):
            res.append(sel + "{" + body + "}")
    return "".join(res)

def mincss(css):
    css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
    css = re.sub(r"\s+", " ", css)
    css = re.sub(r"\s*([{};:,>])\s*", r"\1", css)
    return css.replace(";}", "}").strip()

def minjs(js):
    js = re.sub(r"^\s*//.*$", "", js, flags=re.M)
    return "\n".join(l.strip() for l in js.splitlines() if l.strip())

out = re.sub(r"<style>(.*?)</style>", lambda m: "<style>" + mincss(purge(mincss(m.group(1)))) + "</style>", src, flags=re.S)
out = re.sub(r"<script>(.*?)</script>", lambda m: "<script>" + minjs(m.group(1)) + "</script>", out, flags=re.S)
out = re.sub(r"<!--.*?-->", "", out, flags=re.S)
out = re.sub(r">\s+<", "> <", out)
out = re.sub(r"\n\s*", "\n", out)
# La página se sirve en "/" (no en /lp/): las rutas relativas tienen que ser absolutas.
out = re.sub(r"""(["'(])img/""", r"\1/lp/img/", out)
(LP / "index.html").write_text(out, encoding="utf-8", newline="\n")
print(f"antes {len(src.encode())/1024:.1f} KB -> despues {len(out.encode())/1024:.1f} KB")
