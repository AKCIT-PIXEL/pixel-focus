// Textos da página nos dois idiomas: inglês na raiz (/) e português em /pt/.
// O `en` é tipado pelo `pt`: chave faltando ou com assinatura diferente é erro de tipo.
// Strings com marcação (<b>, <code>, <a>) entram com set:html; são fixas, nunca vêm de dados.

export type Lang = 'en' | 'pt';

const pt = {
  meta: {
    title: 'Pixel Focus — AKCIT-PIXEL',
    description: 'Refocagem generativa a partir de uma única foto: DeblurNet, DepthPro e BokehNet, com os checkpoints da equipe AKCIT-PIXEL.',
    ogTitle: 'Pixel Focus: refocagem generativa a partir de uma única foto',
    ogDescription: 'Mude o foco e a abertura de uma foto depois de tirada: DeblurNet, DepthPro e BokehNet, com os checkpoints da equipe AKCIT-PIXEL.',
    ogImageAlt: 'Foto refocada pelo BokehNet, com o título Pixel Focus',
    twitterDescription: 'Mude o foco e a abertura de uma foto depois de tirada, a partir de uma única imagem.',
  },
  common: {
    loading: 'Carregando…',
    soon: 'Em breve',
    noData: 'Sem dados',
    noDataHint: 'As amostras desta seção serão publicadas em breve.',
    beforeAfter: 'Comparação antes e depois',
    caseN: (n: number) => `Caso ${n}`,
    photoN: (n: number) => `Foto ${n}`,
    officialModel: 'official (artigo)',
  },
  nav: {
    label: 'Seções da página',
    links: {
      pipeline: 'Como funciona',
      refocus: 'Refocagem',
      gallery: 'Antes e depois',
      models: 'Modelos',
      ocr: 'OCR',
      credits: 'Método',
    },
    langLabel: 'Idioma',
    // Rótulo do link para o outro idioma, escrito no idioma de destino.
    switchLabel: 'Read in English',
  },
  hero: {
    title: 'Pixel Focus: refocagem generativa a partir de uma única foto',
    subtitle: 'Mude o foco e a abertura de uma foto depois de tirada',
    team: 'Equipe AKCIT-PIXEL',
    affiliation: 'Centro de Competência EMBRAPII em Tecnologias Imersivas (AKCIT) · UFG',
    paperLink: 'Artigo do GenFocus (arXiv)',
    hfLink: 'Datasets (HF)',
    codeSoon: 'Código (em breve)',
    videoSection: 'Vídeo de demonstração',
    videoLabel: 'Varredura do plano de foco numa foto, do fundo ao primeiro plano e de volta',
    tagline: `A partir de <b>uma única foto</b>, recuperamos a imagem toda em foco, estimamos a profundidade e sintetizamos um desfoque
    realista para <b>qualquer plano de foco e abertura</b>.`,
  },
  pipeline: {
    title: 'Como funciona',
    lead: `A entrada passa pelo <b>DeblurNet</b>, que devolve a cena toda em foco. O <b>DepthPro</b> estima a profundidade, de onde sai a
      disparidade <code>disp = 1/profundidade</code>. O mapa de desfoque (círculo de confusão) é <code>CoC = K · |disp − disp_foco|</code>,
      e o <b>BokehNet</b> sintetiza o bokeh condicionado nele.`,
    placeholder: 'As etapas animadas do pipeline aparecem aqui em breve.',
    stage: 'Etapa do pipeline',
    steps: 'Etapas do pipeline',
    inputLabel: 'Entrada',
    inputText: 'Foto de entrada, com desfoque original.',
    deblurText: 'DeblurNet: a cena inteira em foco.',
    depthParallaxText: 'DepthPro: a profundidade estimada desloca a cena em camadas. Mova o ponteiro ou arraste para ver em 2,5D.',
    depthText: 'DepthPro: profundidade estimada (mais claro = mais perto).',
    cocLabel: 'Mapa de CoC',
    cocText: (k: number) => `Mapa de desfoque para K = ${k}: zero no plano de foco, crescendo com a distância a ele.`,
    bokehText: (model: string) => `BokehNet (${model}): bokeh sintetizado a partir do mapa.`,
  },
  refocus: {
    title: 'Refocagem interativa',
    lead: 'Clique na foto para escolher o plano de foco. O controle deslizante muda a intensidade do desfoque (K).',
    leadModels: 'Os modelos recebem o mesmo K, mas respondem de forma diferente: o oficial produz o desfoque mais forte, e nos ajustados pela equipe o desfoque é mais contido.',
    placeholder: 'A refocagem por clique aparece aqui em breve.',
    stage: 'Foto refocada',
    hint: 'Clique para focar',
    far: 'longe',
    near: 'perto',
    kAria: 'Intensidade do desfoque (K)',
    kLabel: 'Desfoque: ',
    k0: 'K = 0 (tudo em foco)',
    status: (plane: number, total: number, model: string) => `Plano de foco ${plane} de ${total} · ${model}`,
  },
  gallery: {
    title: 'Antes e depois',
    lead: 'Arraste a barra para comparar.',
    deblurTitle: 'Remoção de desfoque (DeblurNet)',
    bokehTitle: 'Síntese de bokeh (BokehNet)',
    deblurAlt: 'Foto desfocada e saída do DeblurNet',
    blurInput: (aperture: string) => `Entrada desfocada (f/${aperture})`,
    deblurCaption: (scene: string, distance: string, source: string) => `Cena ${scene}, foco a ${distance} m. Fonte: ${source}.`,
    bokehAlt: 'Foto nítida e saída do BokehNet',
    sharpInput: 'Entrada nítida',
  },
  models: {
    title: 'Comparação dos modelos BokehNet',
    lead: `A mesma cena nos três checkpoints: <code>official</code> (pesos do artigo), <code>synth-2gpu</code> e <code>v2-fase2</code>
      (nossos). Cada modelo abre no K que melhor reproduz o alvo real e tem o próprio controle de K.`,
    note: `Os modelos foram avaliados em protocolos diferentes: <code>official</code> e <code>synth-2gpu</code> a 544 px com grade de 8 valores
      de K, e <code>v2-fase2</code> a 1024 px com grade de 9. Por isso cada controle usa a grade do seu modelo, rotulada em relação ao K de
      referência (K<sub>gt</sub>), e as posições dos controles não se correspondem entre modelos.`,
    bestK: ' · melhor K',
    outputAlt: (model: string) => `Saída do ${model}`,
    kAria: (model: string) => `K do modelo ${model}`,
    sliderAlt: 'Alvo real e saída do modelo',
    target: 'Alvo real',
    afterBest: (model: string) => `${model}, melhor K`,
    gridEdge: ' (no limite da grade)',
    caption: (dataset: string, sample: string, model: string, k: string, edge: string) =>
      `${dataset} · ${sample} · melhor K de ${model}: ${k}${edge}, `,
    sceneN: (n: number, dataset: string) => `Cena ${n} · ${dataset}`,
    pickerHint: 'Alvo real × modelo (cada um no seu melhor K):',
    sweepTitle: 'Varredura de K por modelo',
  },
  ocr: {
    title: 'Texto legível de novo',
    body: 'Texto desfocado no fundo, a saída do DeblurNet e o que um OCR consegue ler antes e depois.',
  },
  credits: {
    title: 'Método e créditos',
    body: `Este trabalho parte do <a href="https://generative-refocusing.github.io/" target="_blank" rel="noopener">GenFocus</a>
    (Generative Refocusing) e usa o <a href="https://github.com/apple/ml-depth-pro" target="_blank" rel="noopener">DepthPro</a>
    para estimar profundidade. Os checkpoints <code>synth-2gpu</code> e <code>v2-fase2</code> foram treinados pela equipe AKCIT-PIXEL.
    Imagens de avaliação dos datasets públicos em
    <a href="https://huggingface.co/AKCITPixel3" target="_blank" rel="noopener">AKCITPixel3</a>.
    As fotos do vídeo do topo e das seções de refocagem e pipeline são os exemplos do repositório
    <a href="https://github.com/rayray9999/Genfocus" target="_blank" rel="noopener">rayray9999/Genfocus</a>.`,
  },
  diagram: {
    label: 'Diagrama do método: entrada, DeblurNet, DepthPro, mapa de CoC e BokehNet',
    input: 'Entrada',
    inputSub: 'foto original',
    deblurSub: 'tudo em foco',
    depthSub: 'profundidade',
    coc: 'Mapa de CoC',
    cocSub: 'CoC = K·|disp − disp_foco|',
    bokehSub: 'bokeh sintetizado',
  },
  footer: `Visual inspirado em <a href="https://nerfies.github.io/" target="_blank" rel="noopener">Nerfies</a> e na página do
      <a href="https://generative-refocusing.github.io/" target="_blank" rel="noopener">GenFocus</a>.`,
};

const en: typeof pt = {
  meta: {
    title: 'Pixel Focus — AKCIT-PIXEL',
    description: 'Generative refocusing from a single photo: DeblurNet, DepthPro and BokehNet, with the AKCIT-PIXEL team’s checkpoints.',
    ogTitle: 'Pixel Focus: generative refocusing from a single photo',
    ogDescription: 'Change the focus and aperture of a photo after capture: DeblurNet, DepthPro and BokehNet, with the AKCIT-PIXEL team’s checkpoints.',
    ogImageAlt: 'Photo refocused by BokehNet, with the title Pixel Focus',
    twitterDescription: 'Change the focus and aperture of a photo after capture, from a single image.',
  },
  common: {
    loading: 'Loading…',
    soon: 'Coming soon',
    noData: 'No data',
    noDataHint: 'Samples for this section are coming soon.',
    beforeAfter: 'Before and after comparison',
    caseN: (n) => `Case ${n}`,
    photoN: (n) => `Photo ${n}`,
    officialModel: 'official (paper weights)',
  },
  nav: {
    label: 'Page sections',
    links: {
      pipeline: 'How it works',
      refocus: 'Refocusing',
      gallery: 'Before and after',
      models: 'Models',
      ocr: 'OCR',
      credits: 'Method',
    },
    langLabel: 'Language',
    switchLabel: 'Ler em português',
  },
  hero: {
    title: 'Pixel Focus: generative refocusing from a single photo',
    subtitle: 'Change the focus and aperture of a photo after capture',
    team: 'AKCIT-PIXEL team',
    affiliation: 'Advanced Knowledge Center for Immersive Technologies (AKCIT) · UFG',
    paperLink: 'GenFocus paper (arXiv)',
    hfLink: 'Datasets (HF)',
    codeSoon: 'Code (coming soon)',
    videoSection: 'Demo video',
    videoLabel: 'The focal plane sweeps across a photo, from the background to the foreground and back',
    tagline: `From <b>a single photo</b>, we recover the all-in-focus image, estimate depth and synthesize realistic defocus
    blur for <b>any focal plane and aperture</b>.`,
  },
  pipeline: {
    title: 'How it works',
    lead: `The input goes through <b>DeblurNet</b>, which recovers the whole scene in focus. <b>DepthPro</b> estimates depth, from which we
      get the disparity <code>disp = 1/depth</code>. The defocus map (circle of confusion) is <code>CoC = K · |disp − disp_focus|</code>,
      and <b>BokehNet</b> synthesizes bokeh conditioned on it.`,
    placeholder: 'The animated pipeline steps are coming soon.',
    stage: 'Pipeline step',
    steps: 'Pipeline steps',
    inputLabel: 'Input',
    inputText: 'Input photo, with its original defocus.',
    deblurText: 'DeblurNet: the whole scene in focus.',
    depthParallaxText: 'DepthPro: the estimated depth shifts the scene in layers. Move the pointer or drag to see it in 2.5D.',
    depthText: 'DepthPro: estimated depth (brighter = closer).',
    cocLabel: 'CoC map',
    cocText: (k) => `Defocus map for K = ${k}: zero at the focal plane, growing with distance from it.`,
    bokehText: (model) => `BokehNet (${model}): bokeh synthesized from the map.`,
  },
  refocus: {
    title: 'Interactive refocusing',
    lead: 'Click the photo to choose the focal plane. The slider sets the blur strength (K).',
    leadModels: 'All models receive the same K but respond differently: the official one blurs the most, while the team’s fine-tuned models produce a milder blur.',
    placeholder: 'Click-to-refocus is coming soon.',
    stage: 'Refocused photo',
    hint: 'Click to focus',
    far: 'far',
    near: 'near',
    kAria: 'Blur strength (K)',
    kLabel: 'Blur: ',
    k0: 'K = 0 (all in focus)',
    status: (plane, total, model) => `Focal plane ${plane} of ${total} · ${model}`,
  },
  gallery: {
    title: 'Before and after',
    lead: 'Drag the bar to compare.',
    deblurTitle: 'Deblurring (DeblurNet)',
    bokehTitle: 'Bokeh synthesis (BokehNet)',
    deblurAlt: 'Blurry photo and DeblurNet output',
    blurInput: (aperture) => `Blurry input (f/${aperture})`,
    deblurCaption: (scene, distance, source) => `Scene ${scene}, focused at ${distance} m. Source: ${source}.`,
    bokehAlt: 'Sharp photo and BokehNet output',
    sharpInput: 'Sharp input',
  },
  models: {
    title: 'BokehNet model comparison',
    lead: `The same scene across the three checkpoints: <code>official</code> (the paper’s weights), <code>synth-2gpu</code> and
      <code>v2-fase2</code> (ours). Each model starts at the K that best reproduces the ground truth and has its own K slider.`,
    note: `The models were evaluated under different protocols: <code>official</code> and <code>synth-2gpu</code> at 544 px with an
      8-value K grid, and <code>v2-fase2</code> at 1024 px with a 9-value grid. Each slider therefore uses its own model’s grid, labeled
      relative to the reference K (K<sub>gt</sub>), and slider positions do not line up across models.`,
    bestK: ' · best K',
    outputAlt: (model) => `${model} output`,
    kAria: (model) => `K for ${model}`,
    sliderAlt: 'Ground truth and model output',
    target: 'Ground truth',
    afterBest: (model) => `${model}, best K`,
    gridEdge: ' (at the edge of the grid)',
    caption: (dataset, sample, model, k, edge) => `${dataset} · ${sample} · best K for ${model}: ${k}${edge}, `,
    sceneN: (n, dataset) => `Scene ${n} · ${dataset}`,
    pickerHint: 'Ground truth vs. model (each at its best K):',
    sweepTitle: 'K sweep per model',
  },
  ocr: {
    title: 'Making blurry text readable again',
    body: 'Blurry text in the background, the DeblurNet output, and what OCR can read before and after.',
  },
  credits: {
    title: 'Method and credits',
    body: `This work builds on <a href="https://generative-refocusing.github.io/" target="_blank" rel="noopener">GenFocus</a>
    (Generative Refocusing) and uses <a href="https://github.com/apple/ml-depth-pro" target="_blank" rel="noopener">DepthPro</a>
    for depth estimation. The <code>synth-2gpu</code> and <code>v2-fase2</code> checkpoints were trained by the AKCIT-PIXEL team.
    Evaluation images come from the public datasets at
    <a href="https://huggingface.co/AKCITPixel3" target="_blank" rel="noopener">AKCITPixel3</a>.
    The photos in the header video and in the refocusing and pipeline sections are the examples from the
    <a href="https://github.com/rayray9999/Genfocus" target="_blank" rel="noopener">rayray9999/Genfocus</a> repository.`,
  },
  diagram: {
    label: 'Method diagram: input, DeblurNet, DepthPro, CoC map and BokehNet',
    input: 'Input',
    inputSub: 'original photo',
    deblurSub: 'all in focus',
    depthSub: 'depth',
    coc: 'CoC map',
    cocSub: 'CoC = K·|disp − disp_focus|',
    bokehSub: 'synthesized bokeh',
  },
  footer: `Design inspired by <a href="https://nerfies.github.io/" target="_blank" rel="noopener">Nerfies</a> and the
      <a href="https://generative-refocusing.github.io/" target="_blank" rel="noopener">GenFocus</a> project page.`,
};

const strings = { pt, en };

export function t(lang: Lang): typeof pt {
  return strings[lang];
}

// Idioma a partir de um código qualquer ('pt', 'pt-BR', Astro.currentLocale...); o padrão é inglês.
export function toLang(code: string | undefined): Lang {
  return code?.startsWith('pt') ? 'pt' : 'en';
}

// Nos scripts de cliente: o bundle é o mesmo nas duas páginas, então o idioma vem do <html lang>.
export function langFromDocument(): Lang {
  return toLang(document.documentElement.lang);
}

// O que muda por idioma fora do texto: <html lang>/hreflang, og:locale, imagem OG, caminho
// da página (relativo à base, passar por asset()) e tag do toLocaleString.
export const LOCALES: Record<Lang, { htmlLang: string; ogLocale: string; ogImage: string; path: string; numberLocale: string }> = {
  en: { htmlLang: 'en', ogLocale: 'en_US', ogImage: 'og-en.jpg', path: '', numberLocale: 'en-US' },
  pt: { htmlLang: 'pt-BR', ogLocale: 'pt_BR', ogImage: 'og.jpg', path: 'pt/', numberLocale: 'pt-BR' },
};

// Tag BCP 47 para o toLocaleString.
export function localeTag(lang: Lang): string {
  return LOCALES[lang].numberLocale;
}
