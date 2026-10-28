// Rótulos exibidos para modelos e datasets, e formatação de números.
import { t, langFromDocument, localeTag } from './i18n';
import { el } from './dom';

// Só usado nos scripts de cliente: o idioma vem do <html lang>.
function modelLabels(): Record<string, string> {
  return { official: t(langFromDocument()).common.officialModel };
}

const DATASET_LABELS: Record<string, string> = { mvlf: 'MVLF', epfl: 'EPFL', zedd: 'ZEDD' };

export function modelLabel(name: string): string {
  return modelLabels()[name] || name;
}

export function datasetLabel(name: string): string {
  return DATASET_LABELS[name] || name;
}

// Formata números no padrão do idioma da página (vírgula decimal em pt, ponto em en).
export function formatNumber(value: number | string, digits = 2): string {
  return Number(value).toLocaleString(localeTag(langFromDocument()), {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

// Texto com "K<sub>gt</sub>": monta os nós sem innerHTML (os dados vêm de JSON).
export function withKgt(before: string, after = ''): (Node | string)[] {
  return [before, el('span', { text: 'K' }, [el('sub', { text: 'gt' })]), after];
}
