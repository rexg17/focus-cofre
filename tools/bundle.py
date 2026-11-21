"""Gera dist/focus-cofre.html: um único arquivo (sem doctype/head/body) para publicar como página."""
import re
from pathlib import Path
R = Path(__file__).resolve().parent.parent
W = R / "web"
html = (W / "index.html").read_text(encoding="utf-8")
head = re.search(r"<head>(.*?)</head>", html, re.S).group(1)
body = re.search(r"<body>(.*?)</body>", html, re.S).group(1)
head = re.sub(r'\s*<meta charset[^>]*>', "", head)
head = re.sub(r'\s*<meta name="viewport"[^>]*>', "", head)
head = re.sub(r'\s*<link rel="stylesheet" href="style.css">', "", head)
css = (W / "style.css").read_text(encoding="utf-8")
body_html = re.sub(r"\s*<script src=\"js/[^\"]+\"></script>", "", body).strip("\n")
names = re.findall(r'<script src="js/([^"]+)"></script>', body)
js = "\n".join((W / "js" / n).read_text(encoding="utf-8").rstrip("\n") for n in names)
out = head.strip("\n") + "\n<style>\n" + css.rstrip("\n") + "\n</style>\n\n" + body_html + "\n\n<script>\n" + js + "\n</script>\n"
d = R / "dist"; d.mkdir(exist_ok=True)
(d / "focus-cofre.html").write_text(out, encoding="utf-8")
print("dist/focus-cofre.html", len(out), "bytes")
