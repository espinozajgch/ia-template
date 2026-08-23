import { describe, it, expect, vi } from 'vitest';
import { ErrorDeApi, CODIGOS, mapearErrorPg, conManejoDeErrores, manejadorFinal } from './errores';

// Dobles mínimos de Express: lo que se prueba es la decisión, no el marco.
function resFalso() {
  const r = {
    headersSent: false,
    codigo: 0 as number,
    cuerpo: null as unknown,
    status(c: number) { r.codigo = c; return r; },
    json(b: unknown) { r.cuerpo = b; r.headersSent = true; return r; },
  };
  return r;
}
const reqFalso = { method: 'GET', path: '/api/x' } as never;
const correr = async (fn: () => Promise<unknown>, registrar?: never) => {
  const res = resFalso();
  await conManejoDeErrores('GET /api/x', fn, registrar)(reqFalso, res as never);
  return res;
};

describe('mapearErrorPg · camina por cause', () => {
  it('encuentra el código en el error de arriba', () => {
    expect(mapearErrorPg({ code: '23505' })?.estado).toBe(409);
  });
  it('lo encuentra ANIDADO, que es como llega de un ORM', () => {
    // drizzle lanza new Error('Failed query', { cause: errorDelDriver })
    const err = new Error('Failed query', { cause: { code: '23505' } });
    const m = mapearErrorPg(err);
    expect(m?.estado).toBe(409);
    expect(m?.codigoPg).toBe('23505');   // el que casó de verdad, no el de arriba
  });
  it('atraviesa varios niveles', () => {
    const err = new Error('a', { cause: new Error('b', { cause: { code: '23503' } }) });
    expect(mapearErrorPg(err)?.codigo).toBe(CODIGOS.CONFLICTO);
  });
  it('no se cuelga con un ciclo', () => {
    const a: Record<string, unknown> = {}; const b: Record<string, unknown> = { cause: a };
    a.cause = b;
    expect(mapearErrorPg(a)).toBeNull();
  });
  it('devuelve null si no hay código conocido', () => {
    expect(mapearErrorPg(new Error('cualquiera'))).toBeNull();
    expect(mapearErrorPg({ code: '99999' })).toBeNull();
  });
});

describe('conManejoDeErrores', () => {
  it('cuando no hay error no interfiere: pasa lo que el manejador escribió', async () => {
    const res = resFalso();
    await conManejoDeErrores('GET /x', async (_req, r) => { r.status(200).json({ ok: true }); })(reqFalso, res as never);
    expect(res.codigo).toBe(200);
    expect(res.cuerpo).toEqual({ ok: true });
  });

  it('un ErrorDeApi sale con SU estado, SU código y SU mensaje', async () => {
    const res = await correr(async () => {
      throw new ErrorDeApi(404, 'Futbolista no encontrado', CODIGOS.NO_ENCONTRADO);
    });
    expect(res.codigo).toBe(404);
    expect(res.cuerpo).toEqual({ error: 'Futbolista no encontrado', codigo: CODIGOS.NO_ENCONTRADO });
  });

  it('un duplicado de PostgreSQL sale como 409, no como 500', async () => {
    // Es el caso que importa: un 500 hace que el cliente reintente y avise a operaciones,
    // cuando el problema estaba en el cuerpo de SU petición.
    const res = await correr(async () => { throw new Error('Failed query', { cause: { code: '23505' } }); });
    expect(res.codigo).toBe(409);
    expect((res.cuerpo as { codigo: string }).codigo).toBe(CODIGOS.CONFLICTO);
  });

  it('lo inesperado sale como 500 SIN filtrar el interior', async () => {
    const antes = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const res = await correr(async () => { throw new Error('conexión a 10.0.0.4:5432 rechazada'); });
      expect(res.codigo).toBe(500);
      const c = JSON.stringify(res.cuerpo);
      expect(c).not.toContain('10.0.0.4');
      expect(c).not.toContain('stack');
    } finally { process.env.NODE_ENV = antes; }
  });

  it('el stack NUNCA va en la respuesta, ni en desarrollo', async () => {
    const antes = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    try {
      const res = await correr(async () => { throw new Error('roto'); });
      // En desarrollo se permite el mensaje, para depurar. El stack no: si existe el
      // camino, se activa en producción el día que la variable esté mal puesta.
      expect((res.cuerpo as { detalle?: string }).detalle).toBe('roto');
      expect(JSON.stringify(res.cuerpo)).not.toMatch(/at .*\(|\.ts:\d+/);
    } finally { process.env.NODE_ENV = antes; }
  });

  it('registra el stack solo para lo INESPERADO', async () => {
    const registrar = vi.fn();
    await correr(async () => { throw new ErrorDeApi(404, 'no está', CODIGOS.NO_ENCONTRADO); }, registrar as never);
    expect(registrar.mock.calls[0][1]).not.toHaveProperty('stack');

    registrar.mockClear();
    await correr(async () => { throw new Error('inesperado'); }, registrar as never);
    expect(registrar.mock.calls[0][1]).toHaveProperty('stack');
  });

  it('registra el código de PG que casó de verdad', async () => {
    const registrar = vi.fn();
    await correr(async () => { throw new Error('Failed query', { cause: { code: '23503' } }); }, registrar as never);
    expect(registrar.mock.calls[0][1].codigoPg).toBe('23503');
  });

  it('si ya se empezó a responder, no vuelve a escribir', async () => {
    const res = resFalso();
    res.headersSent = true;
    await conManejoDeErrores('GET /x', async () => { throw new Error('tarde'); })(reqFalso, res as never);
    expect(res.codigo).toBe(0);   // no tocó la respuesta en curso
  });

  it('un cuerpo a medida sustituye al sobre estándar', async () => {
    const res = await correr(async () => {
      throw new ErrorDeApi(503, 'caído', CODIGOS.SERVICIO_NO_DISPONIBLE, { ok: false, motivo: 'mantenimiento' });
    });
    expect(res.cuerpo).toEqual({ ok: false, motivo: 'mantenimiento' });
  });
});

describe('manejadorFinal · lo que se escapa', () => {
  it('captura lo que no pasó por el envoltorio', () => {
    const res = resFalso();
    manejadorFinal()(new Error('del marco'), reqFalso, res as never, (() => {}) as never);
    expect(res.codigo).toBe(500);
    expect((res.cuerpo as { codigo: string }).codigo).toBe(CODIGOS.ERROR_INTERNO);
  });
  it('respeta un ErrorDeApi que llegue por ahí', () => {
    const res = resFalso();
    manejadorFinal()(new ErrorDeApi(403, 'no', CODIGOS.SIN_PERMISO), reqFalso, res as never, (() => {}) as never);
    expect(res.codigo).toBe(403);
  });
});
