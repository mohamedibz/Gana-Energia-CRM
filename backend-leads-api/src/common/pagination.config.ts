const FALLBACK_MAX_LIMIT = 100;
const FALLBACK_DEFAULT_LIMIT = 20;

const positiveInt = (raw: string | undefined, fallback: number): number => {
  const value = Number(raw);
  return Number.isInteger(value) && value >= 1 ? value : fallback;
};

// Se leen en cada petición (no al cargar el módulo) para respetar el .env aunque se cargue después de los imports
export const getMaxPageLimit = (): number => positiveInt(process.env.PAGINATION_MAX_LIMIT, FALLBACK_MAX_LIMIT);

// El valor por defecto nunca supera el máximo
export const getDefaultPageLimit = (): number =>
  Math.min(positiveInt(process.env.PAGINATION_DEFAULT_LIMIT, FALLBACK_DEFAULT_LIMIT), getMaxPageLimit());
