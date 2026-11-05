"""
Genera versiones de UN SOLO ARCHIVO de las páginas públicas, para pegarlas
en un elemento "Código personalizado" de LeadConnector / GoHighLevel.

Recomendado en su lugar: publicar toda la carpeta sitio-web en Cloudflare Pages
(ver GUIA_BASE_DE_DATOS.md). El panel /admin debe vivir en Cloudflare Pages
aunque uses esta opción para las páginas públicas.

Uso (Windows):
    python herramientas\\generar_ghl.py URL_BASE_IMAGENES [SLUG_INICIO] [SLUG_DESTINO]
Ejemplo:
    python herramientas\\generar_ghl.py https://assets.cdn.filesafe.space/XXXX/media/ /home /destino
"""
import pathlib
import re
import sys

RAIZ = pathlib.Path(__file__).resolve().parent.parent
WEB = RAIZ / "sitio-web"
SALIDA = RAIZ / "para-leadconnector"


def generar(pagina, base_img, slugs):
    html = (WEB / pagina).read_text(encoding="utf-8")

    estilos = "<style>\n" + (WEB / "css/estilos.css").read_text(encoding="utf-8") + "\n</style>"

    def js(m):
        return "<script>\n" + (WEB / m.group(1)).read_text(encoding="utf-8") + "\n</script>"

    head_links = "".join(re.findall(r'<link rel="(?:preconnect|stylesheet)" href="https://fonts[^>]*>\n?', html))
    cuerpo = re.search(r"<body[^>]*>(.*)</body>", html, re.S).group(1)
    cuerpo = re.sub(r'<script src="(js/[^"]+)"></script>', js, cuerpo)
    salida = (
        "<!-- Caribbean Travel · pegar completo en un elemento de Código personalizado -->\n"
        + head_links
        + estilos
        + '\n<div class="ct-sitio">\n' + cuerpo.strip() + "\n</div>\n"
    )
    salida = salida.replace('src="img/', 'src="' + base_img).replace('"img/', '"' + base_img)
    for viejo, nuevo in slugs.items():
        salida = salida.replace('"' + viejo, '"' + nuevo).replace("'" + viejo, "'" + nuevo)
    return salida


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    base_img = sys.argv[1].rstrip("/") + "/"
    slugs = {
        "index.html": sys.argv[2] if len(sys.argv) > 2 else "/home",
        "destino.html": sys.argv[3] if len(sys.argv) > 3 else "/destino",
    }
    SALIDA.mkdir(exist_ok=True)
    for pagina, nombre in (("index.html", "inicio.html"), ("destino.html", "destino.html")):
        (SALIDA / nombre).write_text(generar(pagina, base_img, slugs), encoding="utf-8")
        print("Generado:", SALIDA / nombre)


if __name__ == "__main__":
    main()
