// Widgets reutilizáveis da página: placeholder sem dados (showNoData), slider
// antes/depois, botões de caso e troca de imagem com crossfade. TypeScript puro, sem dependências.
import { t, langFromDocument } from './i18n';
import { el } from './dom';

// Placeholder das seções sem dados: os manifestos ainda não foram gerados.
function noDataPlaceholder(): HTMLDivElement {
  const s = t(langFromDocument());
  return el('div', { class: 'placeholder-box' }, [
    el('span', { class: 'tag-soon', text: s.common.noData }),
    el('p', { text: s.common.noDataHint }),
  ]);
}

// Qualquer falha (manifesto ausente, vazio ou incompleto) cai no placeholder.
export function showNoData(root: HTMLElement, err: unknown): void {
  console.warn((err as Error).message);
  root.replaceChildren(noDataPlaceholder());
}

function preload(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`failed to load ${src}`));
    img.src = src;
  });
}

export interface BeforeAfterData {
  before: string;
  after: string;
  beforeLabel?: string;
  afterLabel?: string;
}

export interface BeforeAfter {
  root: HTMLDivElement;
  update(data: BeforeAfterData): void;
}

// Slider antes/depois: a imagem "depois" fica por cima, recortada com
// clip-path; arrastar (mouse ou toque) move o corte e a alça.
export function createBeforeAfter({ before, after, beforeLabel, afterLabel, alt = '' }: BeforeAfterData & { alt?: string }): BeforeAfter {
  const imgBefore = el('img', { class: 'ba-before', alt, draggable: 'false', decoding: 'async' });
  const imgAfter = el('img', { class: 'ba-after', alt: '', draggable: 'false', decoding: 'async', 'aria-hidden': 'true' });
  const labelLeft = el('span', { class: 'ba-label is-left' });
  const labelRight = el('span', { class: 'ba-label is-right' });
  const handle = el('div', { class: 'ba-handle' });
  const root = el('div', {
    class: 'ba-slider',
    role: 'slider',
    tabindex: '0',
    'aria-label': t(langFromDocument()).common.beforeAfter,
    'aria-valuemin': '0',
    'aria-valuemax': '100',
  }, [imgBefore, imgAfter, handle, labelLeft, labelRight]);

  // Proporção real da imagem, usada no CSS para limitar a altura à tela.
  imgBefore.addEventListener('load', () => {
    if (imgBefore.naturalHeight) root.style.setProperty('--ar', String(imgBefore.naturalWidth / imgBefore.naturalHeight));
  });

  let position = 50;
  function setPosition(percent: number): void {
    position = Math.min(100, Math.max(0, percent));
    imgAfter.style.clipPath = `inset(0 0 0 ${position}%)`;
    handle.style.left = `${position}%`;
    root.setAttribute('aria-valuenow', String(Math.round(position)));
  }

  function positionFromEvent(event: PointerEvent): number {
    const rect = root.getBoundingClientRect();
    return ((event.clientX - rect.left) / rect.width) * 100;
  }

  // Pointer events cobrem mouse, toque e caneta; touch-action: pan-y no CSS
  // mantém a rolagem vertical da página no celular.
  let dragging = false;
  root.addEventListener('pointerdown', (event) => {
    dragging = true;
    root.setPointerCapture(event.pointerId);
    setPosition(positionFromEvent(event));
  });
  root.addEventListener('pointermove', (event) => {
    if (dragging) setPosition(positionFromEvent(event));
  });
  const stop = (): void => { dragging = false; };
  root.addEventListener('pointerup', stop);
  root.addEventListener('pointercancel', stop);
  root.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') setPosition(position - 5);
    else if (event.key === 'ArrowRight') setPosition(position + 5);
    else return;
    event.preventDefault();
  });

  function update(data: BeforeAfterData): void {
    imgBefore.src = data.before;
    imgAfter.src = data.after;
    labelLeft.textContent = data.beforeLabel || '';
    labelRight.textContent = data.afterLabel || '';
    labelLeft.hidden = !data.beforeLabel;
    labelRight.hidden = !data.afterLabel;
  }

  if (before || after) update({ before, after, beforeLabel, afterLabel });
  setPosition(50);
  return { root, update };
}

// Grupo de botões ("Caso 1", "Caso 2"...) com seleção única.
export function createCaseButtons(labels: string[], onSelect: (index: number) => void, initial = 0) {
  const root = el('div', { class: 'case-buttons', role: 'group' });
  const buttons = labels.map((label, index) => {
    const button = el('button', { class: 'btn', type: 'button', text: label, 'aria-pressed': 'false' });
    button.addEventListener('click', () => select(index));
    root.append(button);
    return button;
  });

  function select(index: number): void {
    buttons.forEach((button, i) => {
      button.classList.toggle('is-selected', i === index);
      button.setAttribute('aria-pressed', String(i === index));
    });
    onSelect(index);
  }

  if (buttons.length) select(initial);
  return { root, select };
}

// Duas camadas de imagem; trocar o src faz crossfade da nova sobre a antiga.
export function createCrossfadeStage(className: string, alt = '') {
  const base = el('img', { alt, draggable: 'false', decoding: 'async' });
  const top = el('img', { class: 'layer-top', alt: '', draggable: 'false', 'aria-hidden': 'true' });
  const root = el('div', { class: className }, [base, top]);
  let token = 0;

  async function show(src: string): Promise<void> {
    const current = ++token;
    if (!base.getAttribute('src')) {
      base.src = src;
      return;
    }
    if (base.getAttribute('src') === src) return;
    try {
      await preload(src);
    } catch (err) {
      console.warn((err as Error).message);
      return;
    }
    if (current !== token) return; // outra troca chegou antes
    top.src = src;
    top.classList.add('is-visible');
    setTimeout(() => {
      if (current !== token) return;
      base.src = src;
      top.classList.remove('is-visible');
    }, 380);
  }

  return { root, show };
}
