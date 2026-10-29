// Amostras dos datasets bokeh-eval-* (static/compare/), geradas offline pelo pipeline interno.
import { asset } from './asset';
import { fetchJSON } from './data';
import { sortModels } from './labels';

export const COMPARE_ROOT = asset('compare/');

export interface ModelSweep {
  best: string;
  best_k: number;
  best_k_index: number;
  best_k_at_boundary?: boolean;
  k_gt: number;
  k_grid: number[];
  frames: string[];
}

export interface CompareMeta {
  id: string;
  dataset: string;
  sample_id: string;
  target: string;
  aif: string;
  models: Record<string, ModelSweep>;
}

export interface CompareData {
  models: string[];
  metas: CompareMeta[];
}

async function fetchCompareData(): Promise<CompareData> {
  const index = await fetchJSON<{ models: string[]; scenes: { meta: string }[] }>(`${COMPARE_ROOT}index.json`);
  const metas = await Promise.all(index.scenes.map((s) => fetchJSON<CompareMeta>(COMPARE_ROOT + s.meta)));
  // Na ordem de exibição (MODEL_ORDER): o primeiro é o modelo padrão das seções 4 e 5.
  return { models: sortModels(index.models), metas };
}

// A galeria de bokeh (seção 4) e a comparação (seção 5) usam os mesmos dados; busca uma vez só.
let cached: Promise<CompareData> | null = null;
export function loadCompareData(): Promise<CompareData> {
  cached ??= fetchCompareData();
  return cached;
}
