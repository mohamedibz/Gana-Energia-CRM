import { describe, expect, it } from 'vitest';
import { validateLead, validateLogin, validatePercent, validatePhone, validateWeights } from './validation';

describe('validation', () => {
  it.each(['0', '50', '100', ' 7 '])('acepta %s como porcentaje', (value) => {
    expect(validatePercent(value)).toBeUndefined();
  });

  it.each(['', 'abc', '-1', '101', '1.5', '1e2'])('rechaza %j como porcentaje', (value) => {
    expect(validatePercent(value)).toBeTruthy();
  });

  it.each(['600123456', '+34 600 123 456'])('acepta el teléfono %s', (value) => {
    expect(validatePhone(value)).toBeUndefined();
  });

  it.each(['', '123', 'abc1234567', '6'.repeat(21)])('rechaza el teléfono %j', (value) => {
    expect(validatePhone(value)).toBeTruthy();
  });

  it('validateLead devuelve solo los campos con error', () => {
    const errors = validateLead({
      nombre: 'Ana',
      telefono: '600123456',
      clienteNuevo: '10',
      interesComercial: '',
      origen: '20',
      antiguedad: '200',
    });

    expect(Object.keys(errors).sort()).toEqual(['antiguedad', 'interesComercial']);
  });

  it('validateLogin exige teléfono válido y contraseña', () => {
    expect(validateLogin({ telefono: '600000001', password: 'x' })).toEqual({});
    expect(Object.keys(validateLogin({ telefono: '1', password: '' }))).toEqual(['telefono', 'password']);
  });

  it('validateWeights comprueba que sumen 100', () => {
    const ok = { clienteNuevo: '40', interesComercial: '30', origen: '20', antiguedad: '10' };
    expect(validateWeights(ok)).toMatchObject({ valid: true, total: 100 });
    expect(validateWeights({ ...ok, origen: '25' })).toMatchObject({ valid: false, total: 105 });
    expect(validateWeights({ ...ok, origen: '' }).valid).toBe(false);
  });
});
