import { describe, it, expect } from 'vitest';
import { Cuenta, costeDe, decidirAlExcederse, type OpcionesCuenta } from './coste';

const ENSAYO = 'ensayo';
const O: OpcionesCuenta = {
  tarifas: { 'modelo-caro': { entradaPorMillon: 3, salidaPorMillon: 15 },
             'modelo-barato': { entradaPorMillon: 0.25, salidaPorMillon: 1.25 } },
  sinCoste: m => m === ENSAYO || m.startsWith('local/'),
};

describe('coste por llamada', () => {
  it('calcula con la tarifa del modelo', () => {
    expect(costeDe({ modelo: 'modelo-caro', tokensEntrada: 1e6, tokensSalida: 1e6 }, O)).toBeCloseTo(18);
  });
  it('el modelo de ensayo cuesta CERO EXACTO', () => {
    // Y no por tener tarifa cero: es que no hubo llamada.
    expect(costeDe({ modelo: ENSAYO, tokensEntrada: 1e9, tokensSalida: 1e9 }, O)).toBe(0);
    expect(costeDe({ modelo: 'local/llama', tokensEntrada: 1e9 }, O)).toBe(0);
  });
  it('sin tokens no es un error: cuenta cero', () => {
    expect(costeDe({ modelo: 'modelo-caro' }, O)).toBe(0);
  });
  it('un modelo sin tarifa no revienta', () => {
    expect(costeDe({ modelo: 'desconocido', tokensEntrada: 1e6 }, O)).toBe(0);
  });
});

describe('la cuenta', () => {
  it('acumula y atribuye por acción', () => {
    // Saber el total no dice dónde recortar; saber qué acción se lo lleva, sí.
    const c = new Cuenta(O);
    c.anotar({ accion: 'resumir',  modelo: 'modelo-caro',   tokensEntrada: 1e6 });
    c.anotar({ accion: 'traducir', modelo: 'modelo-barato', tokensEntrada: 1e6 });
    c.anotar({ accion: 'resumir',  modelo: 'modelo-caro',   tokensEntrada: 1e6 });
    expect(c.llamadas).toBe(3);
    expect(c.porAccion.resumir).toBeCloseTo(6);
    expect(c.masCaras(1)[0].accion).toBe('resumir');
  });
  it('cuenta las fallidas aparte', () => {
    const c = new Cuenta(O);
    c.anotar({ modelo: 'modelo-caro', error: 'tiempo agotado' });
    expect(c.llamadas).toBe(1);
    expect(c.fallidas).toBe(1);
  });
  it('sabe si se pasó del presupuesto', () => {
    const c = new Cuenta({ ...O, presupuesto: 5 });
    c.anotar({ modelo: 'modelo-caro', tokensEntrada: 1e6 });   // 3
    expect(c.excedido).toBe(false);
    c.anotar({ modelo: 'modelo-caro', tokensEntrada: 1e6 });   // 6
    expect(c.excedido).toBe(true);
  });
});

describe('la guarda de integridad', () => {
  it('una cuenta hecha SOLO con el doble se marca como ensayo', () => {
    // Sin esto, una ejecución de ensayo produce un informe de coste que parece una
    // medición real y vale cero.
    const c = new Cuenta(O);
    c.anotar({ modelo: ENSAYO, tokensEntrada: 1e6 });
    c.anotar({ modelo: 'local/llama', tokensEntrada: 1e6 });
    expect(c.esEnsayo).toBe(true);
    expect(c.resumen()).toContain('ENSAYO');
  });
  it('con UNA sola llamada real deja de ser ensayo', () => {
    const c = new Cuenta(O);
    c.anotar({ modelo: ENSAYO, tokensEntrada: 1e6 });
    c.anotar({ modelo: 'modelo-caro', tokensEntrada: 1e6 });
    expect(c.esEnsayo).toBe(false);
  });
  it('una cuenta vacía NO es ensayo: es que no hay nada', () => {
    expect(new Cuenta(O).esEnsayo).toBe(false);
  });
});

describe('qué hacer al pasarse', () => {
  const excedida = () => { const c = new Cuenta({ ...O, presupuesto: 1 }); c.anotar({ accion: 'narrar', modelo: 'modelo-caro', tokensEntrada: 1e6 }); return c; };

  it('dentro del presupuesto, sigue sin más', () => {
    expect(decidirAlExcederse(new Cuenta({ ...O, presupuesto: 100 }), 'cortar').seguir).toBe(true);
  });
  it('«cortar» respeta el techo y no termina el trabajo', () => {
    const d = decidirAlExcederse(excedida(), 'cortar');
    expect(d.seguir).toBe(false);
    expect(d.aviso).toContain('narrar');   // dice qué se lo llevó
  });
  it('«avisar» termina el trabajo y no respeta el techo', () => {
    const d = decidirAlExcederse(excedida(), 'avisar');
    expect(d.seguir).toBe(true);
    expect(d.degradarA).toBeUndefined();
  });
  it('«degradar» es la única que cumple las dos', () => {
    const d = decidirAlExcederse(excedida(), 'degradar', 'local/llama');
    expect(d.seguir).toBe(true);
    expect(d.degradarA?.modelo).toBe('local/llama');
  });
  it('«degradar» sin modelo de respaldo LO DICE, en vez de fingir', () => {
    const d = decidirAlExcederse(excedida(), 'degradar');
    expect(d.seguir).toBe(true);
    expect(d.degradarA).toBeUndefined();
    expect(d.aviso).toContain('sin modelo de respaldo');
  });
});
