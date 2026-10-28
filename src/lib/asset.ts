// Caminho de um asset de static/ respeitando a base do site (GitHub Pages em subdiretório).
const rawBase = import.meta.env.BASE_URL;
const BASE = rawBase.endsWith('/') ? rawBase : `${rawBase}/`;

export function asset(path: string): string {
  return BASE + path.replace(/^\/+/, '');
}
