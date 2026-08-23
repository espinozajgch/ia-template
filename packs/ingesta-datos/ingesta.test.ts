import { describe, it, expect } from 'vitest';
import {
  normalizar, plegarConfundibles, nombreBase, calificador, nombresConCalificadorCoinciden,
  desglosarNombre, nombresDePersonaCoinciden, distanciaEdicion, seParecen, planificarFusiones,
} from './identidades';
import { decidir, reconciliar } from './consenso';

describe('homóglifos — el fallo invisible', () => {
  it('pliega letras griegas y cirílicas que se ven igual', () => {
    // "ΑRAY" con alfa griega vs "ARAY" con A latina: idénticos a la vista.
    const conAlfa = 'ΑRAY JHONΑTΑN';
    expect(conAlfa).not.toBe('ARAY JHONATAN');            // distintos para la máquina
    expect(normalizar(conAlfa)).toBe(normalizar('ARAY JHONATAN'));  // el mismo tras plegar
  });
  it('pliega cirílicas', () => expect(plegarConfundibles('СОСА')).toBe('COCA'));
  it('no toca lo que no se confunde', () => expect(plegarConfundibles('ÑOÑO')).toBe('ÑOÑO'));
});

describe('normalización', () => {
  it('quita tildes, puntuación y espacios de más', () => {
    expect(normalizar('  José   Pérez-López.  ')).toBe('JOSE PEREZ-LOPEZ');
    expect(normalizar("O'BRIEN")).toBe('O BRIEN');
  });
  it('aguanta entradas vacías', () => expect(normalizar(undefined as unknown as string)).toBe(''));
});

describe('nombres con calificador', () => {
  it('separa base y calificador', () => {
    expect(nombreBase('ACME (ES)')).toBe('ACME');
    expect(calificador('ACME (ES)')).toBe('ES');
    expect(calificador('ACME')).toBeNull();
  });
  it('coinciden si uno no califica', () => {
    expect(nombresConCalificadorCoinciden('ACME', 'ACME (ES)')).toBe(true);
  });
  it('NO coinciden si se contradicen', () => {
    // Las dos fuentes están afirmando procedencias distintas: creerles a las dos es inventar.
    expect(nombresConCalificadorCoinciden('ACME (ES)', 'ACME (MX)')).toBe(false);
  });
});

describe('nombres de persona con iniciales', () => {
  it('la inicial es compatible con la palabra completa', () => {
    expect(nombresDePersonaCoinciden('PEREZ J', 'PEREZ JUAN')).toBe(true);
    expect(nombresDePersonaCoinciden('GARCIA LOPEZ M A', 'GARCIA LOPEZ MIGUEL ANGEL')).toBe(true);
  });
  it('una inicial que contradice NO coincide', () => {
    expect(nombresDePersonaCoinciden('PEREZ J', 'PEREZ LUIS')).toBe(false);
  });
  it('una palabra completa que el otro no tiene NO coincide', () => {
    expect(nombresDePersonaCoinciden('PEREZ JUAN', 'PEREZ PEDRO')).toBe(false);
  });
  it('el orden no importa', () => {
    expect(nombresDePersonaCoinciden('JUAN PEREZ', 'PEREZ JUAN')).toBe(true);
  });
  it('desglosa palabras e iniciales', () => {
    expect(desglosarNombre('PEREZ J M')).toEqual({ palabras: ['PEREZ'], iniciales: ['J', 'M'] });
  });
});

describe('distancia de edición acotada', () => {
  it('mide bien', () => expect(distanciaEdicion('CASA', 'CASO', 3)).toBe(1));
  it('corta en cuanto supera el límite', () => {
    expect(distanciaEdicion('ABCDEFGH', 'ZZZZZZZZ', 2)).toBe(3);   // limite+1, no el valor real
  });
  it('descarta por longitud sin calcular', () => {
    expect(distanciaEdicion('A', 'ABCDEFGHIJ', 2)).toBe(3);
  });
});

describe('parecido — para sospechar, no para fusionar', () => {
  it('idénticos tras normalizar', () => expect(seParecen('José Pérez', 'JOSE PEREZ')).toBe(true));
  it('una errata en un nombre largo sí', () => {
    expect(seParecen('ADMINISTRACION GENERAL', 'ADMINISTRACION GENERAI')).toBe(true);
  });
  it('una letra distinta en uno corto NO', () => {
    // En un nombre de seis letras una diferencia ya es mucho.
    expect(seParecen('TIBU', 'TABU')).toBe(false);
  });
});

describe('plan de fusión', () => {
  it('conserva el que más registros tiene', () => {
    const p = planificarFusiones([
      { id: 1, nombre: 'PEREZ J',    registros: 3 },
      { id: 2, nombre: 'PEREZ JUAN', registros: 40 },
    ]);
    expect(p).toHaveLength(1);
    expect(p[0].conservar.id).toBe(2);
    expect(p[0].absorber.map(a => a.id)).toEqual([1]);
    expect(p[0].motivo).toBe('iniciales-compatibles');
  });
  it('no propone nada cuando no hay duplicados', () => {
    expect(planificarFusiones([
      { id: 1, nombre: 'PEREZ JUAN', registros: 5 },
      { id: 2, nombre: 'PEREZ LUIS', registros: 5 },
    ])).toEqual([]);
  });
  it('con empate de registros gana el nombre más completo', () => {
    const p = planificarFusiones([
      { id: 1, nombre: 'PEREZ J',    registros: 5 },
      { id: 2, nombre: 'PEREZ JUAN', registros: 5 },
    ]);
    expect(p[0].conservar.nombre).toBe('PEREZ JUAN');
  });
});

describe('consenso entre fuentes', () => {
  const o = (fuente: string, valor: unknown, extra = {}) => ({ fuente, valor, ...extra });

  it('una sola fuente decide, pero se sabe que está sola', () => {
    const d = decidir([o('web1', 4)]);
    expect(d.valor).toBe(4);
    expect(d.motivo).toBe('unica-fuente');
    expect(d.enConflicto).toBe(false);
  });
  it('mayoría gana y no marca conflicto', () => {
    const d = decidir([o('a', 4), o('b', 4), o('c', 4), o('d', 5)]);
    expect(d.valor).toBe(4);
    expect(d.apoyos).toBe(3);
    expect(d.enConflicto).toBe(false);
    expect(d.motivo).toBe('mayoria');
  });
  it('lo oficial gana aunque esté en minoría', () => {
    // Tres periódicos coincidiendo no cambian lo que publicó el organismo.
    const d = decidir([o('web1', 4), o('web2', 4), o('web3', 4), o('boletin', 7, { esOficial: true })]);
    expect(d.valor).toBe(7);
    expect(d.motivo).toBe('oficial');
    expect(d.enConflicto).toBe(false);
  });
  it('la confianza pesa más que el número de fuentes', () => {
    const d = decidir([o('ocr1', 4, { confianza: 0.3 }), o('ocr2', 4, { confianza: 0.3 }), o('csv', 5, { confianza: 1 })]);
    expect(d.valor).toBe(5);
  });
  it('un empate real se marca en conflicto aunque haya que elegir', () => {
    const d = decidir([o('a', 4, { prioridad: 10 }), o('b', 5, { prioridad: 1 })]);
    expect(d.valor).toBe(4);
    expect(d.enConflicto).toBe(true);
    expect(d.motivo).toBe('desempate-por-prioridad');
    expect(d.discrepancias).toHaveLength(2);
  });
  it('sin observaciones no inventa', () => {
    const d = decidir<number>([]);
    expect(d.valor).toBeNull();
    expect(d.motivo).toBe('sin-acuerdo');
  });
});

describe('reconciliación de un registro completo', () => {
  it('resuelve campo a campo y dice cuáles quedaron en disputa', () => {
    const r = reconciliar(
      [
        { fuente: 'a', datos: { nombre: 'ACME', telefono: '600', ciudad: 'Madrid' } },
        { fuente: 'b', datos: { nombre: 'ACME', telefono: '601' } },
        { fuente: 'c', datos: { nombre: 'ACME', ciudad: 'Madrid' } },
      ],
      ['nombre', 'telefono', 'ciudad'],
    );
    expect(r.registro.nombre).toBe('ACME');
    expect(r.registro.ciudad).toBe('Madrid');
    expect(r.conflictos.map(c => c.campo)).toEqual(['telefono']);   // 600 vs 601
    expect(r.conflictos[0].discrepancias).toHaveLength(2);
  });
});
