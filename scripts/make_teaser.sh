#!/usr/bin/env bash
# Gera o vídeo do cabeçalho (varredura de foco f00 → fN → f00 com crossfade),
# o pôster do vídeo e as imagens Open Graph (pt e en), a partir dos quadros pré-renderizados
# em static/refocus/. Pode ser rodado de novo a qualquer momento (sobrescreve, e
# com as mesmas entradas gera arquivos idênticos).
#
# Usa o ffmpeg-full do Homebrew (drawtext, libwebp, libsvtav1) quando existir.
# Sem libsvtav1 a versão WebM/AV1 é pulada; sem libwebp o pôster é uma cópia do quadro;
# sem drawtext o título da OG é escrito com Pillow (scripts/og_title.py, via uv).
#
# Uso: PHOTO=0 MODEL=v2-fase2 K_INDEX=5 bash scripts/make_teaser.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PHOTO="${PHOTO:-0}"         # no cello o v2-fase2 quase não desfoca; na foto 0 o bokeh aparece
MODEL="${MODEL:-v2-fase2}"  # nosso modelo principal
K_INDEX="${K_INDEX:-5}"     # índice em meta.ks (5 → K = 50, o máximo: o v2-fase2 desfoca bem menos que o official)
HOLD="${HOLD:-0.6}"         # duração de cada quadro na sequência, em s (inclui a transição)
FADE="${FADE:-0.3}"         # duração do crossfade, em s
FPS="${FPS:-30}"
CRF="${CRF:-26}"            # H.264
AV1_CRF="${AV1_CRF:-38}"    # AV1 (SVT-AV1); 0 desliga a versão WebM
WIDTH="${WIDTH:-1024}"
OG_PLANE="${OG_PLANE:-}"    # plano da imagem OG; vazio = coc_example.plane do meta.json
OG_TITLE="${OG_TITLE:-Pixel Focus}"                                           # og.jpg (pt)
OG_SUBTITLE="${OG_SUBTITLE:-Refocagem generativa a partir de uma única foto · AKCIT-PIXEL}"
OG_TITLE_EN="${OG_TITLE_EN:-Pixel Focus}"                                     # og-en.jpg (en)
OG_SUBTITLE_EN="${OG_SUBTITLE_EN:-Generative refocusing from a single photo · AKCIT-PIXEL}"
OG_FONT="${OG_FONT:-/System/Library/Fonts/SFNS.ttf}"   # precisa ter ç, ã e →

FFMPEG_FULL=/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg
if [[ -z "${FFMPEG:-}" ]]; then
  if [[ -x "$FFMPEG_FULL" ]]; then FFMPEG="$FFMPEG_FULL"; else FFMPEG=ffmpeg; fi
fi

SRC="$ROOT/static/refocus/$PHOTO"
OUT="$ROOT/static/teaser"
META="$SRC/meta.json"
[[ -f "$META" ]] || { echo "meta.json not found: $META" >&2; exit 1; }

# Recursos do binário escolhido.
encoders="$("$FFMPEG" -hide_banner -encoders 2>/dev/null)"
filters="$("$FFMPEG" -hide_banner -filters 2>/dev/null)"
has_encoder() { grep -qE "^ *V\S* +$1 " <<<"$encoders"; }
has_filter() { grep -qE "^ *\S+ +$1 " <<<"$filters"; }

read -r N_PLANES COC_PLANE FRAME_PATTERN < <(python3 -I -c '
import json, sys
m = json.load(open(sys.argv[1]))
print(len(m["planes"]), m["coc_example"]["plane"], m["frame_pattern"])
' "$META")
OG_PLANE="${OG_PLANE:-$COC_PLANE}"

# Caminho do quadro pelo frame_pattern do meta.json ({model}, {plane:02d}, {k_index}).
frame() {
  local name="${FRAME_PATTERN//\{model\}/$MODEL}"
  name="${name//\{plane:02d\}/$(printf '%02d' "$1")}"
  name="${name//\{k_index\}/$K_INDEX}"
  printf '%s/%s' "$SRC" "$name"
}

# Sequência de planos: 0 → N-1 → 0 (o último quadro igual ao primeiro fecha o loop).
seq_planes=()
for ((i = 0; i < N_PLANES; i++)); do seq_planes+=("$i"); done
for ((i = N_PLANES - 2; i >= 0; i--)); do seq_planes+=("$i"); done

inputs=()
filter=""
for idx in "${!seq_planes[@]}"; do
  f="$(frame "${seq_planes[$idx]}")"
  [[ -f "$f" ]] || { echo "missing frame: $f (incomplete model?)" >&2; exit 1; }
  inputs+=(-loop 1 -framerate "$FPS" -t "$HOLD" -i "$f")
  filter+="[$idx:v]scale=$WIDTH:-2:flags=lanczos,setsar=1,format=yuv420p,fps=$FPS,settb=AVTB[v$idx];"
done

# Encadeia os xfade: a transição k começa em k·(HOLD − FADE).
prev="v0"
last=$((${#seq_planes[@]} - 1))
for ((k = 1; k <= last; k++)); do
  offset=$(awk -v k="$k" -v h="$HOLD" -v f="$FADE" 'BEGIN { printf "%.3f", k * (h - f) }')
  label="x$k"
  [[ $k -eq $last ]] && label="out"
  filter+="[$prev][v$k]xfade=transition=fade:duration=$FADE:offset=$offset[$label];"
  prev="$label"
done
filter="${filter%;}"

mkdir -p "$OUT"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# +bitexact tira versão do encoder e IDs aleatórios do contêiner: saída idêntica a cada execução.
"$FFMPEG" -hide_banner -loglevel error -y "${inputs[@]}" \
  -filter_complex "$filter" -map "[out]" \
  -c:v libx264 -preset slow -crf "$CRF" -profile:v high -pix_fmt yuv420p \
  -fflags +bitexact -flags:v +bitexact -movflags +faststart -an "$TMP/teaser.mp4"
mv -f "$TMP/teaser.mp4" "$OUT/teaser.mp4"
outputs="teaser.mp4"

# Versão AV1/WebM (bem menor); o <video> da página a lista antes da MP4 quando existe.
if [[ "$AV1_CRF" != 0 ]] && has_encoder libsvtav1; then
  # SVT_LOG=1: só erros do SVT-AV1 (o padrão imprime a configuração inteira).
  SVT_LOG=1 "$FFMPEG" -hide_banner -loglevel error -y "${inputs[@]}" \
    -filter_complex "$filter" -map "[out]" \
    -c:v libsvtav1 -preset 6 -crf "$AV1_CRF" -g 240 -pix_fmt yuv420p \
    -fflags +bitexact -flags:v +bitexact -an "$TMP/teaser.webm"
  mv -f "$TMP/teaser.webm" "$OUT/teaser.webm"
  outputs+=", teaser.webm"
else
  echo "warning: no libsvtav1 (or AV1_CRF=0); teaser.webm not generated" >&2
fi

# Pôster: o primeiro quadro da sequência, codificado em WebP na largura do vídeo.
poster_src="$(frame "${seq_planes[0]}")"
if has_encoder libwebp; then
  "$FFMPEG" -hide_banner -loglevel error -y -i "$poster_src" \
    -vf "scale=$WIDTH:-2:flags=lanczos" -c:v libwebp -quality 80 -compression_level 6 \
    -fflags +bitexact -frames:v 1 -update 1 "$TMP/poster.webp"
  mv -f "$TMP/poster.webp" "$OUT/poster.webp"
else
  echo "warning: no libwebp; poster copied from frame" >&2
  cp -f "$poster_src" "$OUT/poster.webp"
fi
outputs+=", poster.webp"

# Imagem Open Graph 1200×630: preenche e recorta o centro do quadro escolhido,
# escurece a parte de baixo com um degradê e escreve título e subtítulo.
# Uma por idioma: make_og <título> <subtítulo> <arquivo em static/>.
og_src="$(frame "$OG_PLANE")"
[[ -f "$og_src" ]] || { echo "missing frame for OG image: $og_src" >&2; exit 1; }
make_og() {
  local title="$1" subtitle="$2" name="$3"
  local og_filter og_out og_font text
  og_filter="[0:v]scale=1200:630:force_original_aspect_ratio=increase:flags=lanczos,crop=1200:630,format=rgba[bg];"
  og_filter+="[1:v]format=rgba[grad];[bg][grad]overlay=0:0:format=auto"
  if has_filter drawtext && [[ -f "$OG_FONT" ]]; then
    # Textos vão por arquivo para não precisar escapar acentos, "·" e "→" no filtro.
    printf '%s' "$title" > "$TMP/og_title.txt"
    printf '%s' "$subtitle" > "$TMP/og_subtitle.txt"
    text="fontfile=$OG_FONT:fontcolor=white:x=64:shadowcolor=black@0.45:shadowx=0:shadowy=2"
    og_filter+=",drawtext=$text:textfile=$TMP/og_title.txt:fontsize=66:y=h-196"
    og_filter+=",drawtext=$text:textfile=$TMP/og_subtitle.txt:fontsize=32:y=h-100:fontcolor=white@0.88"
    og_out="$TMP/og.jpg"
  else
    # Sem drawtext: o ffmpeg gera um PNG sem texto e o Pillow escreve título e subtítulo.
    # Se a fonte não existir, tenta um TTF/OTF dos pacotes @fontsource (hoje só trazem woff).
    og_font="$OG_FONT"
    if [[ ! -f "$og_font" ]]; then
      og_font="$(find -L "$ROOT/node_modules/@fontsource/google-sans" "$ROOT/node_modules/@fontsource/noto-sans" \
        -type f \( -iname '*.ttf' -o -iname '*.otf' \) 2>/dev/null | LC_ALL=C sort | head -n 1)"
    fi
    if [[ -n "$og_font" ]] && command -v uv >/dev/null; then
      og_out="$TMP/og.png"
    else
      echo "warning: no drawtext or font $OG_FONT; $name without title" >&2
      og_out="$TMP/og.jpg"
    fi
  fi
  [[ "$og_out" == *.jpg ]] && og_filter+=",format=yuvj444p"
  "$FFMPEG" -hide_banner -loglevel error -y -i "$og_src" \
    -f lavfi -i "color=black:s=1200x630:d=1,format=rgba,geq=r=0:g=0:b=0:a='230*pow(clip((Y-150)/480\,0\,1)\,1.4)'" \
    -filter_complex "$og_filter" -q:v 3 -fflags +bitexact -frames:v 1 -update 1 "$og_out"
  if [[ "$og_out" == *.png ]]; then
    env -u VIRTUAL_ENV uv run --quiet --no-project --isolated --with pillow python -I "$ROOT/scripts/og_title.py" \
      "$og_out" "$TMP/og.jpg" "$og_font" "$title" "$subtitle"
  fi
  mv -f "$TMP/og.jpg" "$ROOT/static/$name"
}
make_og "$OG_TITLE" "$OG_SUBTITLE" og.jpg
make_og "$OG_TITLE_EN" "$OG_SUBTITLE_EN" og-en.jpg

echo "ok: $PHOTO/$MODEL, K index $K_INDEX, ${#seq_planes[@]} frames → static/teaser/{$outputs}, static/{og.jpg, og-en.jpg} ($FFMPEG)"
