"""Reduce el peso de los assets locales sin perder transparencia.

Uso puntual desde la raíz del proyecto:
  python scripts/optimizar-assets.py

Solo convierte imágenes que realmente aparecen en el código JavaScript y
conserva en PNG los íconos que Android/Expo usan desde app.json.
"""

from pathlib import Path
import re

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
KEEP_NAMES = {
    "16.png",
    "notifications.png",
    "favicon.png",
    "icon.png",
    "adaptive-icon.png",
    "splash.png",
    "splash-icon.png",
}
SOURCE_EXTENSIONS = {".js", ".jsx", ".ts", ".tsx"}
SKIP_DIRECTORIES = {".git", ".expo", "android", "ios", "node_modules", "dist", "web-build"}
ASSET_PATTERN = re.compile(r"assets/[^\"'`\s)]+\.(?:png|jpe?g)", re.IGNORECASE)
WEBP_QUALITY = 82


def referenced_assets():
    references = set()
    for source in ROOT.rglob("*"):
        if not source.is_file() or source.suffix.lower() not in SOURCE_EXTENSIONS or SKIP_DIRECTORIES.intersection(source.parts):
            continue
        text = source.read_text(encoding="utf-8", errors="ignore").replace("\\", "/")
        references.update(match.removeprefix("assets/") for match in ASSET_PATTERN.findall(text))
    return references


def main():
    references = referenced_assets()
    conversions = []
    for relative in sorted(references):
        source = ASSETS / relative
        if not source.exists() or source.name in KEEP_NAMES or source.suffix.lower() not in {".png", ".jpg", ".jpeg"}:
            continue
        target = source.with_suffix(".webp")
        image = Image.open(source)
        image.load()
        has_alpha = image.mode in {"RGBA", "LA"} or "transparency" in image.info
        image = image.convert("RGBA" if has_alpha else "RGB")
        image.save(target, "WEBP", quality=WEBP_QUALITY, method=4)
        conversions.append((source, target, has_alpha))

    replacements = {}
    # Permite volver a ejecutar el script después de una conversión ya
    # aplicada: actualiza referencias antiguas aunque el PNG original ya no
    # exista en el árbol de trabajo.
    for target in ASSETS.rglob("*.webp"):
        for old_suffix in (".png", ".jpg", ".jpeg"):
            old = target.with_suffix(old_suffix)
            if not old.exists():
                replacements[old.relative_to(ROOT).as_posix()] = target.relative_to(ROOT).as_posix()
    for source, target, _ in conversions:
        old = source.relative_to(ROOT).as_posix()
        new = target.relative_to(ROOT).as_posix()
        replacements[old] = new

    before = sum(source.stat().st_size for source, _, _ in conversions if source.exists())
    changed_sources = 0
    for source in ROOT.rglob("*"):
        if not source.is_file() or source.suffix.lower() not in SOURCE_EXTENSIONS or SKIP_DIRECTORIES.intersection(source.parts):
            continue
        original = source.read_text(encoding="utf-8", errors="ignore")
        # Nunca normalizar barras invertidas en el archivo completo: eso
        # rompería expresiones regulares y strings como "\\n". Solo se
        # reemplazan las rutas de assets exactas que encontramos arriba.
        updated = original
        for old, new in replacements.items():
            updated = updated.replace(old, new)
        if updated != original:
            source.write_text(updated, encoding="utf-8", newline="\n")
            changed_sources += 1

    removed = 0
    for source, target, _ in conversions:
        if target.exists() and target.stat().st_size > 0:
            source.unlink()
            removed += 1

    after = sum(target.stat().st_size for _, target, _ in conversions if target.exists())
    print(f"Convertidas: {removed}/{len(conversions)} imágenes")
    print(f"Archivos JS actualizados: {changed_sources}")
    print(f"Peso WebP generado: {after / 1048576:.2f} MB")


if __name__ == "__main__":
    main()
