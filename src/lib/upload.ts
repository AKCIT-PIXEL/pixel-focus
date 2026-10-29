// Seção "Teste com sua foto": escolha da foto (arrastar ou seletor), redução para 1024 px no
// navegador, ponto de foco por clique, K e modelo, e envio ao servidor de refocagem.
// O servidor vem de PUBLIC_REFOCUS_API no build; sem ele, tudo funciona até o botão Processar,
// que fica desativado, e a foto não sai do navegador.
import { el } from './dom';
import { createBeforeAfter, createCaseButtons } from './widgets';
import { MODEL_ORDER, modelLabel } from './labels';
import { t, langFromDocument } from './i18n';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 20 * 1024 * 1024;
const MAX_SIDE = 1024;
const K_MIN = 5;
const K_MAX = 50;
const K_DEFAULT = 30;
const TIMEOUT_MS = 120_000;

const s = t(langFromDocument());

// Reduz a foto para lado maior ≤ MAX_SIDE e recodifica em JPEG (o navegador já aplica a orientação EXIF).
async function downscale(file: File): Promise<{ blob: Blob; width: number; height: number }> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.round(img.naturalWidth * scale);
    const height = Math.round(img.naturalHeight * scale);
    const canvas = el('canvas', { width: String(width), height: String(height) });
    canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
    if (!blob) throw new Error('canvas.toBlob failed');
    return { blob, width, height };
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Falha já traduzida para o visitante (a mensagem vem do i18n); qualquer outro erro vira errorUnexpected.
class RefocusError extends Error {}

// Envia a foto e os parâmetros (multipart) e devolve a imagem de resultado. O timeout cobre
// a resposta inteira (cabeçalhos e corpo); o controller também é abortado ao trocar de foto.
async function requestRefocus(
  endpoint: string,
  fields: { image: Blob; focusX: number; focusY: number; k: number; model: string },
  controller: AbortController,
): Promise<Blob> {
  const form = new FormData();
  form.append('image', fields.image, 'photo.jpg');
  form.append('focus_x', fields.focusX.toFixed(4));
  form.append('focus_y', fields.focusY.toFixed(4));
  form.append('k', String(fields.k));
  form.append('model', fields.model);
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, TIMEOUT_MS);
  const transportError = (err: unknown): RefocusError =>
    new RefocusError(timedOut ? s.upload.errorTimeout : s.upload.errorNetwork, { cause: err });
  try {
    let response: Response;
    try {
      response = await fetch(endpoint, { method: 'POST', body: form, signal: controller.signal });
    } catch (err) {
      throw transportError(err);
    }
    if (!response.ok) throw new RefocusError(s.upload.errorServer(response.status));
    let blob: Blob;
    try {
      blob = await response.blob();
    } catch (err) {
      throw transportError(err);
    }
    if (!blob.type.startsWith('image/')) throw new RefocusError(s.upload.errorBadResponse);
    return blob;
  } finally {
    clearTimeout(timer);
  }
}

export function initUpload(container: HTMLElement, endpoint: string | undefined): void {
  // Estado da foto atual; as URLs de objeto são liberadas ao trocar de foto.
  let photo: { blob: Blob; url: string } | null = null;
  let resultUrl = '';
  let focus: { x: number; y: number } | null = null;
  let model = MODEL_ORDER[0];
  // Pedido em andamento; reset() o aborta, e uma resposta atrasada de um pedido abortado é ignorada.
  let inFlight: AbortController | null = null;

  // --- Escolha da foto ---
  const fileInput = el('input', { type: 'file', accept: ACCEPTED_TYPES.join(','), class: 'sr-only', tabindex: '-1', 'aria-hidden': 'true' });
  // Nome acessível = texto principal visível; a dica de formatos entra como descrição.
  const dropZone = el('div', {
    class: 'upload-drop', role: 'button', tabindex: '0', 'aria-labelledby': 'upload-drop-title', 'aria-describedby': 'upload-drop-hint',
  }, [
    el('p', { id: 'upload-drop-title', class: 'font-display text-lg text-ink', text: s.upload.drop }),
    el('p', { id: 'upload-drop-hint', class: 'mt-1 text-sm text-muted', text: s.upload.dropHint }),
  ]);
  const error = el('p', { class: 'upload-error', role: 'alert' });
  error.hidden = true;

  // --- Foto carregada: prévia, foco, K, modelo e ações ---
  const previewImg = el('img', { alt: '', draggable: 'false' });
  const marker = el('div', { class: 'focus-marker' });
  const hint = el('div', { class: 'refocus-hint', text: s.refocus.hint });
  // Mesmo palco da refocagem; recebe o foco do teclado e o rótulo descreve a foto e a ação.
  const stage = el('div', { class: 'refocus-stage', tabindex: '0', role: 'group', 'aria-label': s.upload.previewAlt }, [previewImg, marker, hint]);
  const focusStatus = el('p', { class: 'figure-caption', 'aria-live': 'polite' });

  const kInput = el('input', {
    type: 'range', class: 'range', id: 'upload-k', min: String(K_MIN), max: String(K_MAX), step: '1',
    value: String(K_DEFAULT), 'aria-label': s.refocus.kAria,
  });
  const kValue = el('span');
  const modelButtons = createCaseButtons(MODEL_ORDER.map(modelLabel), (i) => { model = MODEL_ORDER[i]; });

  const processButton = el('button', { class: 'btn btn-primary', type: 'button', text: s.upload.process });
  const resetButton = el('button', { class: 'btn', type: 'button', text: s.upload.reset });
  const notes = el('div', { class: 'mt-3 space-y-1 text-center text-xs text-muted' }, [
    !endpoint && el('p', { class: 'tag-soon mb-0', text: s.upload.soon }),
    el('p', { text: endpoint ? s.upload.privacyApi : s.upload.privacy }),
  ]);

  const result = createBeforeAfter({ before: '', after: '', alt: s.upload.resultAlt });
  const resultWrap = el('div', { class: 'mt-6' }, [result.root]);
  resultWrap.hidden = true;

  const editor = el('div', {}, [
    stage,
    focusStatus,
    el('div', { class: 'refocus-controls' }, [
      el('p', { class: 'mb-1 text-center text-xs text-muted', text: s.upload.modelLabel }),
      modelButtons.root,
      el('label', { for: 'upload-k' }, [s.refocus.kLabel, kValue]),
      kInput,
    ]),
    el('div', { class: 'mt-3 flex flex-wrap justify-center gap-2' }, [processButton, resetButton]),
    notes,
    resultWrap,
  ]);
  editor.hidden = true;

  container.replaceChildren(el('div', {}, [fileInput, dropZone]), error, editor);

  function showError(message: string): void {
    error.textContent = message;
    error.hidden = !message;
  }

  function syncControls(): void {
    kValue.textContent = `K = ${kInput.value}`;
    kInput.setAttribute('aria-valuetext', kValue.textContent);
    focusStatus.textContent = focus ? s.upload.focusAt(focus.x, focus.y) : s.upload.focusNone;
    // Sem servidor o botão fica sempre desativado; com servidor, depois de escolher o foco.
    const busy = inFlight !== null;
    processButton.disabled = !endpoint || !focus || busy;
    processButton.textContent = busy ? s.upload.processing : s.upload.process;
    stage.setAttribute('aria-busy', String(busy));
  }

  function setFocus(x: number, y: number): void {
    focus = { x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)) };
    marker.style.left = `${focus.x * 100}%`;
    marker.style.top = `${focus.y * 100}%`;
    marker.style.display = 'block';
    hint.classList.add('is-hidden');
    syncControls();
  }

  function clearResult(): void {
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    resultUrl = '';
    resultWrap.hidden = true;
  }

  function reset(): void {
    inFlight?.abort();
    inFlight = null;
    clearResult();
    if (photo) URL.revokeObjectURL(photo.url);
    photo = null;
    focus = null;
    marker.style.display = 'none';
    hint.classList.remove('is-hidden');
    previewImg.removeAttribute('src');
    fileInput.value = '';
    editor.hidden = true;
    dropZone.hidden = false;
    showError('');
    dropZone.focus();
  }

  async function loadFile(file: File | undefined): Promise<void> {
    if (!file) return;
    showError('');
    if (!ACCEPTED_TYPES.includes(file.type)) return showError(s.upload.errorType);
    if (file.size > MAX_BYTES) return showError(s.upload.errorSize);
    let scaled: Awaited<ReturnType<typeof downscale>>;
    try {
      scaled = await downscale(file);
    } catch (err) {
      console.warn((err as Error).message);
      return showError(s.upload.errorRead);
    }
    reset();
    photo = { blob: scaled.blob, url: URL.createObjectURL(scaled.blob) };
    previewImg.src = photo.url;
    // Proporção da foto para o palco, os controles e o resultado (mesmas regras de .refocus-stage).
    editor.style.setProperty('--ar', String(scaled.width / scaled.height));
    dropZone.hidden = true;
    editor.hidden = false;
    syncControls();
    stage.focus();
  }

  async function processPhoto(): Promise<void> {
    if (!endpoint || !photo || !focus || inFlight) return;
    const controller = new AbortController();
    inFlight = controller;
    const current = photo;
    const usedModel = model;
    showError('');
    syncControls();
    try {
      const blob = await requestRefocus(endpoint, { image: current.blob, focusX: focus.x, focusY: focus.y, k: Number(kInput.value), model: usedModel }, controller);
      if (inFlight !== controller) return; // a foto foi trocada ou removida durante o pedido
      clearResult();
      resultUrl = URL.createObjectURL(blob);
      result.update({ before: current.url, after: resultUrl, beforeLabel: s.upload.before, afterLabel: s.upload.after(modelLabel(usedModel)) });
      resultWrap.hidden = false;
    } catch (err) {
      if (inFlight !== controller) return;
      if (!(err instanceof RefocusError)) console.warn(err);
      showError(err instanceof RefocusError ? err.message : s.upload.errorUnexpected);
    } finally {
      if (inFlight === controller) {
        inFlight = null;
        syncControls();
      }
    }
  }

  // Seletor de arquivo: clique, Enter ou espaço na área de soltar.
  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    fileInput.click();
  });
  fileInput.addEventListener('change', () => loadFile(fileInput.files?.[0]));

  // Arrastar e soltar.
  dropZone.addEventListener('dragover', (event) => {
    event.preventDefault();
    dropZone.classList.add('is-dragging');
  });
  // dragleave também dispara ao passar sobre os filhos; só limpa ao sair da área de fato.
  dropZone.addEventListener('dragleave', (event) => {
    if (!dropZone.contains(event.relatedTarget as Node | null)) dropZone.classList.remove('is-dragging');
  });
  dropZone.addEventListener('drop', (event) => {
    event.preventDefault();
    dropZone.classList.remove('is-dragging');
    loadFile(event.dataTransfer?.files[0]);
  });

  // Foco: clique na prévia; no teclado, Enter centraliza e as setas movem o ponto.
  stage.addEventListener('click', (event) => {
    const rect = stage.getBoundingClientRect();
    setFocus((event.clientX - rect.left) / rect.width, (event.clientY - rect.top) / rect.height);
  });
  stage.addEventListener('keydown', (event) => {
    const step = 0.05;
    const { x, y } = focus ?? { x: 0.5, y: 0.5 };
    const moves: Record<string, [number, number]> = {
      Enter: [x, y], ' ': [x, y],
      ArrowLeft: [x - step, y], ArrowRight: [x + step, y], ArrowUp: [x, y - step], ArrowDown: [x, y + step],
    };
    const next = moves[event.key];
    if (!next) return;
    event.preventDefault();
    setFocus(next[0], next[1]);
  });

  kInput.addEventListener('input', syncControls);
  processButton.addEventListener('click', processPhoto);
  resetButton.addEventListener('click', reset);
  syncControls();
}
