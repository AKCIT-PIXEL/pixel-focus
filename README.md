# Pixel Focus (`pixel-focus`)

**Nome provisório:** “Pixel Focus” ainda não é definitivo e pode mudar.

Project page estática do trabalho de refocagem generativa da equipe AKCIT-PIXEL
(DeblurNet → DepthPro → BokehNet), com foco no nosso checkpoint de BokehNet `v2-fase2`, comparado ao `synth-2gpu` (também nosso) e ao `official`
(pesos do GenFocus, que replicamos e modificamos). A ordem de exibição fica em `MODEL_ORDER` (`src/lib/labels.ts`).
Este repositório contém só o site; os assets que ele mostra são gerados à parte (ver
[De onde vêm os assets](#de-onde-vêm-os-assets)).

Astro 7 + Tailwind 4, sem framework de UI: os widgets são componentes `.astro` com `<script>` em
TypeScript. Os dados (`static/compare`, `static/deblur`, `static/refocus`) são lidos em tempo de
execução, então assets novos aparecem no site sem rebuild (no Pages, depois do próximo deploy).

O site é bilíngue: **inglês na raiz** (`/`) e **português em `/pt/`**, com um link EN/PT no fim do
menu que mantém a seção atual (`#hash`). Não há detecção do idioma do navegador.

## Ver localmente

Requer Node 24 e pnpm (via mise).

```sh
pnpm install
pnpm dev                 # http://localhost:4321, com recarga automática
pnpm astro check         # tipos (TS strict)
pnpm build               # gera dist/
pnpm preview             # serve dist/
```

## GitHub Pages

O site de projeto fica em `https://<org>.github.io/<repo>/`, então o build precisa da base:

```sh
SITE_BASE=/pixel-focus SITE_URL=https://akcit-pixel.github.io pnpm build
SITE_BASE=/pixel-focus pnpm preview   # http://localhost:4321/pixel-focus/ e .../pixel-focus/pt/
```

`SITE_BASE` (padrão `/`) vira o `base` do Astro; todo caminho de asset passa por `asset()` em
`src/lib/asset.ts`. `SITE_URL` é opcional e só serve para as meta tags OG/Twitter saírem com URL
absoluta (e para o canonical). O workflow `.github/workflows/pages.yml` faz isso sozinho a cada push na `main`
(em *Settings → Pages*, escolher a fonte **GitHub Actions**).

## Estrutura

```
astro.config.mjs           base via SITE_BASE; publicDir = static/; i18n (en na raiz, pt em /pt/)
src/pages/index.astro      página em inglês (/)
src/pages/pt/index.astro   página em português (/pt/)
src/components/Page.astro  monta as 9 seções e o rodapé para o idioma recebido
src/layouts/Base.astro     <head>: meta, OG/Twitter, canonical e hreflang por idioma, favicon
src/components/            uma seção por componente (SectionNav, Hero, Pipeline, Refocus, Upload, Gallery,
                           Changes, ModelCompare, OcrPlaceholder, MethodDiagram, Credits)
src/lib/                   widgets.ts (slider antes/depois, botões, crossfade, placeholder sem dados),
                           dom.ts, data.ts, labels.ts (ordem e rótulos dos modelos), upload.ts (seção
                           "Teste com sua foto"), dados de refocus/compare, asset()
src/lib/i18n.ts            todo o texto visível da página, em pt e en
src/styles/global.css      Tailwind (@theme) + classes dos widgets montados por JS
static/compare/            seção 5 e galeria de bokeh
static/deblur/             galeria de deblur
static/refocus/            seções 2 e 3 e diagrama do método
static/teaser/, og*.jpg    vídeo do topo, pôster e imagens OG og.jpg (pt) e og-en.jpg (en), geradas por make_teaser.sh
scripts/                   make_teaser.sh e og_title.py (vídeo do topo e imagens OG)
```

As fontes (Google Sans e Noto Sans, só o subconjunto latino) são auto-hospedadas via `@fontsource`.

## Textos e idiomas

Todo texto visível (HTML, rótulos dos widgets, `aria-label`, meta OG/Twitter) fica em `src/lib/i18n.ts`,
num dicionário `{ pt, en }`. O `en` é tipado pelo `pt`, então uma chave que falte num idioma quebra o
`pnpm check`. Para mudar um texto, edite as duas versões ali; os componentes não têm texto solto.

- No HTML do servidor, os componentes usam `t(toLang(Astro.currentLocale))`.
- Os `<script>` de cliente são um bundle só para as duas páginas, então leem o idioma em tempo de
  execução com `t(langFromDocument())` (vem do `<html lang>`). Os números seguem o idioma
  (`formatNumber` usa `localeTag`: vírgula decimal em pt, ponto em en).
- Strings com marcação (`<b>`, `<code>`, `<a>`) entram com `set:html`; são fixas, nunca vêm de dados.

## Vídeo do topo e imagem OG

```sh
bash scripts/make_teaser.sh            # PHOTO=0 MODEL=v2-fase2 K_INDEX=5 por padrão
```

Usa o `ffmpeg-full` do Homebrew (`/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg`) quando existe; a variável
`FFMPEG` sobrepõe. Gera `static/teaser/teaser.mp4` (H.264), `teaser.webm` (AV1, se houver libsvtav1),
`poster.webp` (libwebp) e as imagens OG 1200×630 `static/og.jpg` (pt) e `static/og-en.jpg` (en), com
título via `drawtext` e fonte SF do sistema (sem `drawtext`, via `scripts/og_title.py`). Os títulos vêm de
`OG_TITLE`/`OG_SUBTITLE` (pt) e `OG_TITLE_EN`/`OG_SUBTITLE_EN` (en).
Com as mesmas entradas, a saída é idêntica byte a byte. Rodar de novo depois de cada atualização de
`static/refocus/` e depois rebuildar (o `<video>` só lista o WebM se ele existir no build).

## Teste com sua foto (`PUBLIC_REFOCUS_API`)

A seção "Teste com sua foto" (`src/components/Upload.astro`, `src/lib/upload.ts`) envia a foto para um
servidor de refocagem definido no build:

```sh
PUBLIC_REFOCUS_API=https://exemplo/refocus pnpm build
```

Contrato: `POST` multipart/form-data com `image` (JPEG, lado maior ≤ 1024 px), `focus_x` e `focus_y`
(0–1, relativos à foto), `k` (número) e `model` (id, ex.: `v2-fase2`); a resposta é a imagem resultante
(`image/*`). O servidor precisa liberar CORS para a origem do site. Sem a variável (o padrão hoje, já que
não há GPU para hospedar), a seção funciona até o botão Processar, que fica desativado, e a foto não sai
do navegador.

## De onde vêm os assets

Os arquivos em `static/compare/`, `static/deblur/` e `static/refocus/` são gerados offline por um
pipeline interno da equipe e copiados para cá prontos; o site não roda nenhum modelo. O formato dos
manifestos (`index.json` e `meta.json`) está documentado nos tipos de `src/lib/refocus.ts` e
`src/lib/compare.ts`. Se o site quebrar com assets novos, a primeira coisa a conferir é se o formato
ainda bate com esses tipos. Sem manifesto, cada seção mostra um aviso de "sem dados" no lugar do widget.

`static/compare/` e `static/deblur/` são amostras dos datasets públicos `AKCITPixel3/bokeh-eval-*` e
`AKCITPixel3/DFD-IF-deblur`. `static/refocus/` traz, por foto, a entrada, a imagem toda em foco, o mapa
de disparidade e uma pilha de foco renderizada por modelo (planos × valores de K).

Os modelos foram avaliados em protocolos diferentes (`official`/`synth-2gpu`: 544 px e grade de 8 K;
`v2-fase2`: 1024 px e grade de 9 K). Por isso a seção 5 compara cada modelo no seu melhor K e dá a
cada um o próprio controle de K, rotulado em relação ao `k_gt`. A seção não tem tabela de métricas.

## Licença

O código do site está sob a licença [MIT](LICENSE). As imagens em `static/` não são cobertas por ela:
as amostras vêm dos datasets `AKCITPixel3` e as fotos de `static/refocus/` (e o vídeo e as imagens OG
derivados delas) são os exemplos do repositório [rayray9999/Genfocus](https://github.com/rayray9999/Genfocus),
provisórios até a troca pelas fotos da equipe.
