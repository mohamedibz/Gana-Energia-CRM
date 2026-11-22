import { Lead } from './lead.js';
import { LeadStatus } from './lead.status.js';
import { calculateScore, getPriority, scoreBreakdown } from './score.js';
import { Weights } from '../../weights/domain/weights.js';

const weights = new Weights(1, 40, 30, 20, 10);

const buildLead = (clienteNuevo: number, interesComercial: number, origen: number, antiguedad: number) =>
  new Lead(1n, 'Ana Torres', '600111222', LeadStatus.NUEVO, null, clienteNuevo, interesComercial, origen, antiguedad);

describe('calculateScore', () => {
  it('aplica la fórmula Σ valoración × peso / 100', () => {
    // 100×0.4 + 50×0.3 + 20×0.2 + 0×0.1 = 59
    expect(calculateScore(buildLead(100, 50, 20, 0), weights)).toBe(59);
  });

  it('devuelve 0 y 100 en los extremos', () => {
    expect(calculateScore(buildLead(0, 0, 0, 0), weights)).toBe(0);
    expect(calculateScore(buildLead(100, 100, 100, 100), weights)).toBe(100);
  });

  it('refleja los pesos usados', () => {
    const onlySeniority = new Weights(2, 0, 0, 0, 100);
    expect(calculateScore(buildLead(100, 100, 100, 7), onlySeniority)).toBe(7);
  });
});

describe('scoreBreakdown', () => {
  it('desglosa cada criterio y los aportes suman la puntuación', () => {
    const lead = buildLead(75, 13, 18, 7);
    const breakdown = scoreBreakdown(lead, weights);

    expect(breakdown).toHaveLength(4);
    expect(breakdown[0]).toEqual({ criterio: 'Cliente nuevo', valoracion: 75, peso: 40, aporte: 30 });

    const total = breakdown.reduce((sum, item) => sum + item.aporte, 0);
    expect(total).toBeCloseTo(calculateScore(lead, weights), 10);
  });
});

describe('getPriority', () => {
  it.each([
    [100, 'ALTA'],
    [75, 'ALTA'],
    [74.99, 'MEDIA'],
    [40, 'MEDIA'],
    [39.99, 'BAJA'],
    [0, 'BAJA'],
  ])('puntuación %s → %s', (score, priority) => {
    expect(getPriority(score)).toBe(priority);
  });
});

describe('Lead', () => {
  it.each([[-1], [101], [10.5], [NaN]])('rechaza el indicador inválido %s', (value) => {
    expect(() => buildLead(value, 0, 0, 0)).toThrow('entre 0 y 100');
  });
});
