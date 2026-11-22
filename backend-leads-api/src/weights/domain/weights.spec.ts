import { AppError } from '../../common/app.error.js';
import { Weights } from './weights.js';

describe('Weights', () => {
  it('acepta una configuración cuya suma es 100', () => {
    expect(new Weights(null, 40, 30, 20, 10)).toBeDefined();
  });

  it.each([
    ['suma menor que 100', [40, 30, 20, 9]],
    ['suma mayor que 100', [40, 30, 20, 11]],
    ['peso negativo', [-10, 60, 30, 20]],
    ['peso mayor que 100', [101, 0, 0, -1]],
    ['peso no entero', [40.5, 29.5, 20, 10]],
  ])('rechaza %s', (_name, [a, b, c, d]) => {
    expect(() => new Weights(null, a, b, c, d)).toThrow(AppError);
  });
});
