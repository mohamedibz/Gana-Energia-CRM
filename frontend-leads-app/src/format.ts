const dateFormat = new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' });

export const formatDate = (iso: string): string => dateFormat.format(new Date(iso));

export const formatScore = (score: number | null): string =>
  score === null ? '—' : score.toLocaleString('es-ES', { maximumFractionDigits: 2 });
