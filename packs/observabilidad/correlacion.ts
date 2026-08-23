/**
 * Correlación: seguir una petición por todo su recorrido.
 *
 * ── Por qué no basta con pasar el identificador ──────────────────────────────
 *
 * Si cada llamada al registro tiene que pasar `{ idPeticion: req.idPeticion }`, todo lo
 * que se registre desde una capa que **no recibe la petición** —servicios, repositorios,
 * ayudantes— queda sin correlación. Y es justo donde ocurren los fallos interesantes.
 *
 * Con `AsyncLocalStorage` el identificador está disponible en cualquier punto de la cadena
 * sin acoplarse al marco web, y el registro lo añade solo.
 */
import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';

export type ContextoPeticion = {
  idPeticion: string;
  usuarioId?: string | number;
  clienteId?: string | number;
  /** Cuándo empezó, para poder medir la duración al terminar. */
  inicio: number;
  [extra: string]: unknown;
};

const almacen = new AsyncLocalStorage<ContextoPeticion>();

export const contextoPeticion = (): ContextoPeticion | undefined => almacen.getStore();

export function conPeticion<T>(ctx: ContextoPeticion, fn: () => T): T {
  return almacen.run(ctx, fn);
}

/** Enriquece el contexto en curso. Se usa tras autenticar, cuando ya se sabe quién es. */
export function anotar(datos: Partial<ContextoPeticion>): void {
  const ctx = almacen.getStore();
  if (ctx) Object.assign(ctx, datos);
}

/** Para el registro: lo que se añade solo a cada entrada. */
export const leerContexto = () => {
  const c = almacen.getStore();
  if (!c) return undefined;
  const { inicio: _inicio, ...resto } = c;
  return resto as Record<string, unknown>;
};

const CABECERAS = ['x-request-id', 'x-correlation-id', 'x-amzn-trace-id', 'traceparent'];

/**
 * Middleware.
 *
 * **Reutiliza el identificador que venga de fuera** si lo hay. Es lo que permite seguir una
 * operación a través de varios servicios: si cada uno genera el suyo, hay tres registros
 * de la misma cosa y ninguna forma de juntarlos.
 *
 * Y **lo devuelve en la respuesta**: quien informa de un fallo puede dar el identificador,
 * y encontrarlo en el registro es inmediato en vez de una búsqueda por hora aproximada.
 */
export function middlewareDeCorrelacion(opciones: { registro?: { info: (m: string, d?: Record<string, unknown>) => void } } = {}) {
  return (req: { headers: Record<string, unknown>; method?: string; path?: string },
          res: { setHeader: (k: string, v: string) => void; on: (e: string, f: () => void) => void; statusCode?: number },
          next: () => void) => {
    const entrante = CABECERAS.map(h => req.headers[h]).find(v => typeof v === 'string' && v);
    // Se acota la longitud: una cabecera de fuera es entrada no confiable, y un
    // identificador de 8 KB acaba en cada línea del registro.
    const idPeticion = (typeof entrante === 'string' ? entrante.slice(0, 128) : null) || randomUUID();

    res.setHeader('x-request-id', idPeticion);

    const ctx: ContextoPeticion = { idPeticion, inicio: Date.now() };
    conPeticion(ctx, () => {
      // Se registra al TERMINAR, no al empezar: así la entrada lleva el estado y la
      // duración. Una línea por petición en vez de dos, y con lo que hace falta.
      res.on('finish', () => {
        opciones.registro?.info('peticion', {
          metodo: req.method, camino: req.path,
          estado: res.statusCode, ms: Date.now() - ctx.inicio,
        });
      });
      next();
    });
  };
}
