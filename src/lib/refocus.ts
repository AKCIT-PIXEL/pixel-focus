// Dados do render offline (static/refocus/), gerados pelo pipeline interno de render.
// Lidos em tempo de execução: uma nova publicação dos renders pode trazer quadros novos depois do build.
import { asset } from './asset';
import { fetchJSON } from './data';
import { sortModels } from './labels';

const REFOCUS_ROOT = asset('refocus/');

export interface RefocusPhoto {
  name: string;
  meta: string;
  thumb?: string;
  size: [number, number];
  models?: string[];
}

export interface RefocusPlane {
  disp_norm: number;
  disp_focus?: number;
  index?: number;
}

// Formato do meta.json publicado por foto. O formato é escrito pelo pipeline interno de render;
// os dois lados mudam juntos.
export type RefocusFileKey = 'input' | 'aif' | 'disp' | 'depth_vis' | 'coc_example';

export interface RefocusMeta {
  name: string;
  size: [number, number];
  planes: RefocusPlane[];
  ks: number[];
  k0: string;
  frame_pattern: string;
  models: { name: string; complete: boolean }[];
  coc_example: { plane: number; k: number };
  files: Record<RefocusFileKey, string>;
}

export interface RefocusItem {
  photo: RefocusPhoto;
  meta: RefocusMeta;
  models: string[];
}

// Só o nome da foto entra nas URLs; o diagrama (build) não tem o RefocusPhoto inteiro.
type PhotoRef = Pick<RefocusPhoto, 'name'>;

// URL de um arquivo da foto listado em meta.files, ou do quadro K = 0 (meta.k0).
export function photoFile(photo: PhotoRef, meta: RefocusMeta, key: RefocusFileKey | 'k0'): string {
  const name = key === 'k0' ? meta.k0 : meta.files[key];
  return `${REFOCUS_ROOT}${photo.name}/${name}`;
}

export function frameUrl(photo: PhotoRef, meta: RefocusMeta, model: string, plane: number, kIndex: number): string {
  const name = meta.frame_pattern
    .replace('{model}', model)
    .replace('{plane:02d}', String(plane).padStart(2, '0'))
    .replace('{k_index}', String(kIndex));
  return `${REFOCUS_ROOT}${photo.name}/${name}`;
}

// Plano e K do exemplo de CoC.
export function cocExample(meta: RefocusMeta): { plane: number; k: number; kIndex: number } {
  const coc = meta.coc_example;
  return { ...coc, kIndex: Math.max(0, meta.ks.indexOf(coc.k)) };
}

// Quadro do BokehNet no plano e K do exemplo de CoC (etapa final do pipeline e do diagrama).
export function cocExampleFrame(photo: PhotoRef, meta: RefocusMeta, model: string): string {
  const { plane, kIndex } = cocExample(meta);
  return frameUrl(photo, meta, model, plane, kIndex);
}

// Na ordem de exibição (MODEL_ORDER): o primeiro é o modelo padrão das seções 2 e 3.
function photoModels(photo: RefocusPhoto, meta: RefocusMeta): string[] {
  // index.json lista só os modelos com todos os quadros prontos.
  const names = photo.models?.length ? photo.models : meta.models.filter((m) => m.complete).map((m) => m.name);
  return sortModels(names);
}

// Proporção da foto (largura/altura), usada no CSS (--ar) para limitar o palco à tela.
export function aspectRatio({ meta }: RefocusItem): string {
  const [w, h] = meta.size;
  return String(w / h);
}

// Plano pré-renderizado cuja disparidade normalizada é a mais próxima da clicada.
export function nearestPlane(planes: RefocusPlane[], dispNorm: number): number {
  let best = 0;
  planes.forEach((p, i) => {
    if (Math.abs(p.disp_norm - dispNorm) < Math.abs(planes[best].disp_norm - dispNorm)) best = i;
  });
  return best;
}

async function fetchRefocusData(): Promise<RefocusItem[]> {
  const index = await fetchJSON<{ photos?: RefocusPhoto[] }>(`${REFOCUS_ROOT}index.json`);
  const photos = index.photos || [];
  const metas = await Promise.all(photos.map((p) => fetchJSON<RefocusMeta>(REFOCUS_ROOT + p.meta)));
  const items = photos
    .map((photo, i) => ({ photo, meta: metas[i], models: photoModels(photo, metas[i]) }))
    .filter((item) => item.models.length);
  if (!items.length) throw new Error('no photo with complete renders');
  return items;
}

// As seções 2 e 3 usam os mesmos dados; busca uma vez só.
let cached: Promise<RefocusItem[]> | null = null;
export function loadRefocusData(): Promise<RefocusItem[]> {
  cached ??= fetchRefocusData();
  return cached;
}
