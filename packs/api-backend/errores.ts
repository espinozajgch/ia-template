/**
 * Errores de la API: un solo sitio decide qué sale por el cable.
 *
 * Portado de una implementación real. Los detalles que parecen menores —caminar por
 * `cause`, cuándo se registra el stack, no ponerlo nunca en la respuesta— son los que
 * costaron incidentes, y están comentados donde toca.
 *
 * ── Las tres capas de un error ───────────────────────────────────────────────
 *
 *   estado HTTP   para el cliente y los intermediarios: 404, 409, 500
 *   código        para el CÓDIGO del cliente: NOT_FOUND, CONFLICT — estable, no se traduce
 *   mensaje       para la persona: cambia, se traduce, no se compara nunca
 *
 * Mezclarlas es lo que produce clientes que comparan cadenas de texto para decidir. El día
 * que alguien corrige una tilde en el mensaje, el cliente deja de funcionar.
 */
import type { Request, Response, NextFunction } from 'express';

export const CODIGOS = {
  ERROR_INTERNO:      'ERROR_INTERNO',
  NO_ENCONTRADO:      'NO_ENCONTRADO',
  CONFLICTO:          'CONFLICTO',
  VALIDACION:         'VALIDACION',
  NO_AUTENTICADO:     'NO_AUTENTICADO',
  SIN_PERMISO:        'SIN_PERMISO',
  SESION_INVALIDA:    'SESION_INVALIDA',
  SESION_CADUCADA:    'SESION_CADUCADA',
  DEMASIADAS_PETICIONES: 'DEMASIADAS_PETICIONES',
  SERVICIO_NO_DISPONIBLE: 'SERVICIO_NO_DISPONIBLE',
  DEPENDENCIA_CAIDA:  'DEPENDENCIA_CAIDA',
} as const;

export type Codigo = typeof CODIGOS[keyof typeof CODIGOS];

/** Error DELIBERADO de negocio. Lo lanza quien conoce la regla que se incumplió. */
export class ErrorDeApi extends Error {
  readonly estado: number;
  readonly codigo: Codigo;
  /** Cuerpo a medida, para endpoints con un contrato que no se puede cambiar. */
  readonly cuerpo?: Record<string, unknown>;

  constructor(estado: number, mensaje: string, codigo: Codigo = CODIGOS.ERROR_INTERNO, cuerpo?: Record<string, unknown>) {
    super(mensaje);
    this.name = 'ErrorDeApi';
    this.estado = estado;
    this.codigo = codigo;
    this.cuerpo = cuerpo;
  }
}

/**
 * Errores de PostgreSQL que en realidad son errores del cliente, no del servidor.
 *
 * Sin este mapeo, mandar un duplicado devuelve **500** — y un 500 dice «fallo del
 * servidor», así que quien lo recibe reintenta, avisa a operaciones y nadie mira el
 * cuerpo de la petición, que es donde estaba el problema.
 */
const ERRORES_PG: Record<string, { estado: number; codigo: Codigo; mensaje: string }> = {
  '23505': { estado: 409, codigo: CODIGOS.CONFLICTO,  mensaje: 'Ya existe un registro con ese valor' },
  '23503': { estado: 409, codigo: CODIGOS.CONFLICTO,  mensaje: 'Referencia a un elemento que no existe' },
  '23502': { estado: 400, codigo: CODIGOS.VALIDACION, mensaje: 'Falta un campo obligatorio' },
  '23514': { estado: 400, codigo: CODIGOS.VALIDACION, mensaje: 'Valor no permitido para uno de los campos' },
  '22P02': { estado: 400, codigo: CODIGOS.VALIDACION, mensaje: 'Formato de dato inválido' },
  '22001': { estado: 400, codigo: CODIGOS.VALIDACION, mensaje: 'Un valor excede la longitud permitida' },
  '40001': { estado: 409, codigo: CODIGOS.CONFLICTO,  mensaje: 'Conflicto de concurrencia, reintenta' },
  '57014': { estado: 504, codigo: CODIGOS.SERVICIO_NO_DISPONIBLE, mensaje: 'La consulta tardó demasiado' },
};

type Mapeo = { estado: number; codigo: Codigo; mensaje: string; codigoPg: string };

/**
 * Busca el código de PostgreSQL **caminando por `cause`**.
 *
 * Hace falta porque los ORM envuelven el error del driver: drizzle lanza
 * `new Error('Failed query', { cause })`. Leer solo el `.code` del error de arriba hacía
 * que el registro contradijera a la respuesta: un 409 en el cable y un `codigoPg`
 * indefinido en el log, así que la traza no servía para diagnosticar nada.
 *
 * El `Set` evita el bucle infinito si algún día un error se referencia a sí mismo.
 */
export function mapearErrorPg(err: unknown, vistos = new Set<unknown>()): Mapeo | null {
  if (typeof err !== 'object' || err === null || vistos.has(err)) return null;
  vistos.add(err);
  const codigoPg = (err as Record<string, unknown>).code;
  if (typeof codigoPg === 'string' && ERRORES_PG[codigoPg]) return { ...ERRORES_PG[codigoPg], codigoPg };
  return mapearErrorPg((err as Record<string, unknown>).cause, vistos);
}

export type Registrador = (evento: string, datos: Record<string, unknown>) => void;

type Manejador = (req: Request, res: Response) => Promise<unknown>;

/**
 * Envuelve un manejador para que **ningún** error salga sin pasar por aquí.
 *
 * La `etiqueta` identifica el endpoint en el registro. Sin ella, un 500 solo dice que algo
 * falló en alguna parte.
 */
export function conManejoDeErrores(etiqueta: string, manejador: Manejador, registrar?: Registrador): Manejador {
  return async (req, res) => {
    try {
      await manejador(req, res);
    } catch (err) {
      const propio = err instanceof ErrorDeApi ? err : null;
      const pg = propio ? null : mapearErrorPg(err);

      // El stack se registra SOLO para lo inesperado.
      //
      // Un ErrorDeApi es deliberado —un 404 de algo que no existe, un 409 de un duplicado—
      // y su stack es ruido: en volumen, llena el registro y tapa lo que sí importa.
      // Lo inesperado, en cambio, sin stack no tiene punto de fallo identificable y el
      // diagnóstico en producción arranca de cero.
      const stack = !propio && err instanceof Error ? err.stack : undefined;

      registrar?.('fallo_en_manejador', {
        ruta: etiqueta,
        metodo: req.method,
        camino: req.path,
        // El código que de VERDAD casó, que puede venir de un `cause` anidado.
        codigoPg: pg?.codigoPg,
        error: err instanceof Error ? err.message : String(err),
        ...(stack ? { stack } : {}),
      });

      // Si ya se empezó a responder —por ejemplo un flujo de datos a medias— escribir
      // ahora rompe la respuesta en curso. Se registra y se deja morir.
      if (res.headersSent) return;

      if (propio) {
        res.status(propio.estado).json(propio.cuerpo ?? { error: propio.message, codigo: propio.codigo });
      } else if (pg) {
        res.status(pg.estado).json({ error: pg.mensaje, codigo: pg.codigo });
      } else {
        // El stack NUNCA va en la respuesta, ni en desarrollo.
        //
        // No es una precaución excesiva: si existe un camino por el que puede aparecer,
        // ese camino se activa en producción el día que alguien despliega con la variable
        // de entorno mal puesta. Que no exista el camino es la única garantía.
        const enDesarrollo = process.env.NODE_ENV !== 'production';
        res.status(500).json({
          error: 'Error interno del servidor',
          codigo: CODIGOS.ERROR_INTERNO,
          ...(enDesarrollo && err instanceof Error ? { detalle: err.message } : {}),
        });
      }
    }
  };
}

/**
 * Red de seguridad final, para lo que se escape del envoltorio: errores lanzados por
 * middleware, por el propio marco o por un manejador que alguien olvidó envolver.
 * Va montado el último.
 */
export function manejadorFinal(registrar?: Registrador) {
  return (err: unknown, req: Request, res: Response, _next: NextFunction) => {
    const propio = err instanceof ErrorDeApi ? err : null;
    registrar?.('error_no_capturado', {
      camino: req.path, metodo: req.method,
      error: err instanceof Error ? err.message : String(err),
      ...(!propio && err instanceof Error ? { stack: err.stack } : {}),
    });
    if (res.headersSent) return;
    if (propio) res.status(propio.estado).json(propio.cuerpo ?? { error: propio.message, codigo: propio.codigo });
    else res.status(500).json({ error: 'Error interno del servidor', codigo: CODIGOS.ERROR_INTERNO });
  };
}
