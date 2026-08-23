import { describe, it, expect, vi } from 'vitest';
import { crearRegistro, serializarSeguro, esSensible, REDACTADO } from './registro';

const capturar = () => {
  const lineas: string[] = [];
  const reg = crearRegistro({ nivelMinimo: 'debug', salida: (_n, l) => lineas.push(l) });
  return { reg, lineas, ultimo: () => JSON.parse(lineas[lineas.length - 1]) };
};

describe('redacción · lo que importa que no salga', () => {
  it('credenciales', () => {
    for (const k of ['password', 'token', 'authorization', 'apiKey', 'refreshToken', 'secret'])
      expect(esSensible(k), k).toBe(true);
  });
  it('documentos y datos personales', () => {
    for (const k of ['dni', 'pasaporte', 'iban', 'fechaNacimiento', 'email', 'telefono'])
      expect(esSensible(k), k).toBe(true);
  });
  it('salud, que es categoría especial', () => {
    for (const k of ['diagnostico', 'historialMedico', 'alergias', 'medicacion'])
      expect(esSensible(k), k).toBe(true);
  });
  it('cubre las VARIANTES del nombre, que un conjunto exacto pierde', () => {
    // Es la razón de tener nivel parcial: nadie escribe siempre la misma clave.
    for (const k of ['userEmail', 'emailContacto', 'usuario_email', 'telefonoFijo', 'correoDeAviso'])
      expect(esSensible(k), k).toBe(true);
  });
  it('normaliza mayúsculas, guiones y guiones bajos', () => {
    for (const k of ['PASSWORD', 'Refresh-Token', 'api_key', 'Fecha_Nacimiento'])
      expect(esSensible(k), k).toBe(true);
  });

  it('NO destruye campos legítimos con nombres cortos', () => {
    // El motivo de que 'ip' y 'nie' sean solo exactos: por subcadena arrasarían.
    for (const k of ['description', 'denied', 'principal', 'recipe', 'panel', 'panic'])
      expect(esSensible(k), k).toBe(false);
  });
  it('NO redacta nombre ni apellido, a propósito', () => {
    // Son el principal asidero para depurar y aparecen en claves que no son
    // datos personales. La decisión está escrita en el módulo.
    expect(esSensible('nombre')).toBe(false);
    expect(esSensible('apellido')).toBe(false);
    expect(esSensible('nombreArchivo')).toBe(false);
  });
  it('NO redacta ip ni userAgent: son el insumo del forense', () => {
    expect(esSensible('ip')).toBe(false);
    expect(esSensible('userAgent')).toBe(false);
  });
});

describe('la redacción es CENTRAL', () => {
  it('un cuerpo de petición entero se registra sin filtrar nada', () => {
    const { reg, ultimo } = capturar();
    // Esta llamada es exactamente la que un día alguien escribe sin pensar.
    reg.info('peticion', { cuerpo: { nombre: 'Ana', email: 'ana@x.com', password: 'hunter2', dni: '12345678Z' } });
    const e = ultimo();
    expect(e.cuerpo.nombre).toBe('Ana');                 // se conserva lo útil
    expect(e.cuerpo.email).toBe(REDACTADO);
    expect(e.cuerpo.password).toBe(REDACTADO);
    expect(e.cuerpo.dni).toBe(REDACTADO);
  });
  it('redacta en profundidad, no solo en el primer nivel', () => {
    const { reg, lineas } = capturar();
    reg.error('x', { a: { b: { c: { token: 'abc123' } } } });
    expect(lineas[0]).not.toContain('abc123');
  });
  it('redacta dentro de arrays', () => {
    const { reg, lineas } = capturar();
    reg.info('x', { lista: [{ email: 'a@b.c' }, { email: 'd@e.f' }] });
    expect(lineas[0]).not.toContain('a@b.c');
    expect(lineas[0]).not.toContain('d@e.f');
  });
});

describe('serializar sin lanzar nunca', () => {
  it('un ciclo se marca, no revienta', () => {
    const a: Record<string, unknown> = { n: 1 }; a.yo = a;
    expect(() => serializarSeguro(a)).not.toThrow();
    expect(serializarSeguro(a)).toContain('[Circular]');
  });

  it('un GRAFO no es un ciclo: el mismo objeto en dos ramas se serializa entero', () => {
    // El fallo sutil: con un conjunto global de «vistos», esto salía como [Circular]
    // siendo perfectamente serializable, y se perdía diagnóstico.
    const jugador = { id: 7, dorsal: 10 };
    const s = serializarSeguro({ jugador, contrato: { jugador } });
    expect(s).not.toContain('[Circular]');
    expect(JSON.parse(s).contrato.jugador.dorsal).toBe(10);
  });

  it('el mismo objeto repetido en un array tampoco es un ciclo', () => {
    const x = { v: 1 };
    const s = serializarSeguro({ lista: [x, x, x] });
    expect(s).not.toContain('[Circular]');
    expect(JSON.parse(s).lista).toHaveLength(3);
  });

  it('BigInt, funciones y errores no lo tumban', () => {
    const s = serializarSeguro({ n: 10n, f: function saluda() {}, e: new Error('roto') });
    const o = JSON.parse(s);
    expect(o.n).toBe('10');
    expect(o.f).toContain('saluda');
    expect(o.e.mensaje).toBe('roto');
    expect(o.e.stack).toBeTruthy();
  });

  it('si todo falla, devuelve algo serializable en vez de lanzar', () => {
    const malo = { get explota() { throw new Error('no me leas'); } };
    expect(() => serializarSeguro(malo)).not.toThrow();
    expect(serializarSeguro(malo)).toContain('errorAlSerializar');
  });
});

describe('contexto automático', () => {
  it('se añade solo, sin que la llamada lo pase', () => {
    const lineas: string[] = [];
    const reg = crearRegistro({
      leerContexto: () => ({ idPeticion: 'abc-123', usuarioId: 9 }),
      salida: (_n, l) => lineas.push(l),
    });
    reg.info('algo pasó');
    const e = JSON.parse(lineas[0]);
    expect(e.idPeticion).toBe('abc-123');
    expect(e.usuarioId).toBe(9);
  });
  it('un valor explícito de la llamada gana al automático', () => {
    const lineas: string[] = [];
    const reg = crearRegistro({ leerContexto: () => ({ idPeticion: 'auto' }), salida: (_n, l) => lineas.push(l) });
    reg.info('x', { idPeticion: 'explícito' });
    expect(JSON.parse(lineas[0]).idPeticion).toBe('explícito');
  });
  it('fuera de una petición sale igual, sin campos vacíos', () => {
    const { reg, ultimo } = capturar();
    reg.info('tarea programada');
    expect(ultimo().mensaje).toBe('tarea programada');
    expect(ultimo()).not.toHaveProperty('idPeticion');
  });
});

describe('niveles', () => {
  it('por debajo del mínimo no se emite', () => {
    const lineas: string[] = [];
    const reg = crearRegistro({ nivelMinimo: 'warn', salida: (_n, l) => lineas.push(l) });
    reg.debug('no'); reg.info('no'); reg.warn('sí'); reg.error('sí');
    expect(lineas).toHaveLength(2);
  });
  it('cada entrada lleva hora y nivel', () => {
    const { reg, ultimo } = capturar();
    reg.warn('ojo');
    expect(ultimo().nivel).toBe('warn');
    expect(new Date(ultimo().hora).getTime()).toBeGreaterThan(0);
  });
  it('los errores van por el canal de error', () => {
    const canales: string[] = [];
    const reg = crearRegistro({ salida: n => canales.push(n) });
    reg.info('a'); reg.error('b');
    expect(canales).toEqual(['info', 'error']);
  });
});

describe('correlación', () => {
  it('el identificador llega a cualquier profundidad sin pasarlo', async () => {
    const { conPeticion, contextoPeticion } = await import('./correlacion');
    const hondo = () => contextoPeticion()?.idPeticion;
    conPeticion({ idPeticion: 'x-1', inicio: Date.now() }, () => {
      expect((() => (() => hondo())())()).toBe('x-1');
    });
  });

  it('reutiliza el identificador que viene de fuera', async () => {
    const { middlewareDeCorrelacion, contextoPeticion } = await import('./correlacion');
    let visto: string | undefined;
    const res = { setHeader: vi.fn(), on: vi.fn(), statusCode: 200 };
    middlewareDeCorrelacion()({ headers: { 'x-request-id': 'de-otro-servicio' } } as never, res as never,
      () => { visto = contextoPeticion()?.idPeticion; });
    // Si cada servicio generase el suyo, habría tres registros de la misma operación
    // y ninguna forma de juntarlos.
    expect(visto).toBe('de-otro-servicio');
    expect(res.setHeader).toHaveBeenCalledWith('x-request-id', 'de-otro-servicio');
  });

  it('acota un identificador entrante desmesurado', async () => {
    const { middlewareDeCorrelacion, contextoPeticion } = await import('./correlacion');
    let visto: string | undefined;
    middlewareDeCorrelacion()({ headers: { 'x-request-id': 'a'.repeat(9000) } } as never,
      { setHeader: vi.fn(), on: vi.fn() } as never, () => { visto = contextoPeticion()?.idPeticion; });
    expect(visto!.length).toBe(128);
  });

  it('genera uno si no viene ninguno', async () => {
    const { middlewareDeCorrelacion, contextoPeticion } = await import('./correlacion');
    let visto: string | undefined;
    middlewareDeCorrelacion()({ headers: {} } as never, { setHeader: vi.fn(), on: vi.fn() } as never,
      () => { visto = contextoPeticion()?.idPeticion; });
    expect(visto).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('anotar enriquece el contexto tras autenticar', async () => {
    const { conPeticion, anotar, contextoPeticion } = await import('./correlacion');
    conPeticion({ idPeticion: 'x', inicio: Date.now() }, () => {
      anotar({ usuarioId: 42 });
      expect(contextoPeticion()?.usuarioId).toBe(42);
    });
  });
});

describe('sondas de salud', () => {
  it('vida no comprueba dependencias, a propósito', async () => {
    const { vida } = await import('./salud');
    // Si la vida fallara por una base caída, se reiniciarían todas las instancias en
    // bucle, y al volver la base no habría nada arriba.
    expect(vida().ok).toBe(true);
  });

  it('disponibilidad falla si una dependencia CRÍTICA falla', async () => {
    const { listo } = await import('./salud');
    const e = await listo([{ nombre: 'base', comprobar: async () => { throw new Error('sin conexión'); } }]);
    expect(e.ok).toBe(false);
    expect(e.dependencias[0].error).toContain('sin conexión');
  });

  it('una dependencia SECUNDARIA caída no saca la instancia de servicio', async () => {
    const { listo } = await import('./salud');
    const e = await listo([
      { nombre: 'base', comprobar: async () => {} },
      { nombre: 'correo', critica: false, comprobar: async () => { throw new Error('caído'); } },
    ]);
    expect(e.ok).toBe(true);                       // degrada, no tumba
    expect(e.dependencias.find(d => d.nombre === 'correo')!.ok).toBe(false);
  });

  it('una dependencia colgada se corta por tiempo y DICE cuál', async () => {
    const { listo } = await import('./salud');
    const e = await listo([{ nombre: 'lenta', comprobar: () => new Promise(() => {}) }], { ms: 50 });
    expect(e.ok).toBe(false);
    expect(e.dependencias[0].error).toMatch(/sin respuesta/);
  });

  it('acota el mensaje de error: una cadena de conexión lleva credenciales', async () => {
    const { listo } = await import('./salud');
    const e = await listo([{ nombre: 'x', comprobar: async () => { throw new Error('y'.repeat(999)); } }]);
    expect(e.dependencias[0].error!.length).toBeLessThanOrEqual(200);
  });
});
