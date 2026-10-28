"""Escreve título e subtítulo na imagem Open Graph quando o ffmpeg não tem drawtext.

Reproduz o drawtext de scripts/make_teaser.sh: x=64, título 66 px em y=h-196,
subtítulo 32 px em y=h-100 (branco a 88%), sombra preta a 45% deslocada 2 px para baixo.

Uso: python og_title.py <entrada.png> <saida.jpg> <fonte.ttf> <título> <subtítulo>
"""

import sys

from PIL import Image, ImageDraw, ImageFont


def draw_line(base: Image.Image, font: ImageFont.FreeTypeFont, text: str, y: int, alpha: int) -> Image.Image:
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    # anchor "lt": y é o topo do texto desenhado, como no drawtext.
    draw.text((64, y + 2), text, font=font, fill=(0, 0, 0, round(255 * 0.45)), anchor="lt")
    draw.text((64, y), text, font=font, fill=(255, 255, 255, alpha), anchor="lt")
    return Image.alpha_composite(base, layer)


def main() -> None:
    src, dst, font_path, title, subtitle = sys.argv[1:6]
    img = Image.open(src).convert("RGBA")
    h = img.height
    img = draw_line(img, ImageFont.truetype(font_path, 66), title, h - 196, 255)
    img = draw_line(img, ImageFont.truetype(font_path, 32), subtitle, h - 100, round(255 * 0.88))
    # subsampling=0 equivale ao yuvj444p do caminho com ffmpeg.
    img.convert("RGB").save(dst, "JPEG", quality=90, subsampling=0, optimize=True)


if __name__ == "__main__":
    main()
