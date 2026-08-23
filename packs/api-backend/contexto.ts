/**
 * Contexto de la petición sin pasarlo por parámetro.
 *
 * ── El problema ──────────────────────────────────────────────────────────────
 *
 * Toda consulta necesita saber de qué cliente es la petición, quién la hizo y con qué
 * identificador de correlación. Las dos salidas habituales fallan:
 *
 *   · Pasar el contexto por parámetro hasta el fondo. Funciona, y contamina la firma de
 *     cada función que hay en medio. Basta que alguien añada una ruta olvidándose del
 *     parámetro para que la consulta salga sin filtrar.
 *
 *   · Una variable global. En un servidor con peticiones concurrentes, la de un usuario
 *     acaba respondiendo con los datos de otro. No es hipotético: es lo que pasa.
 *
 * ── La salida ────────────────────────────────────────────────────────────────
 *
 * `AsyncLocalStorage` da un almacén atado a la CADENA DE EJECUCIÓN: cada petición corre
 * dentro del suyo y lo ve todo lo que llame, por hondo que esté, sin pasarlo.
 *
 * Y un `Proxy` sobre el cliente de base de datos hace que la aplicación siga importando
 * `db` como siempre, mientras por debajo las consultas van al cliente de ESTA petición.
 */
import { AsyncLocalStorage } from 'node:async_hooks';

export type Contexto<TDb = unknown, TUsuario = unknown> = {
  db: TDb;
  usuario?: TUsuario;
  clienteId?: string | number;
  idPeticion?: string;
};

export const almacen = new AsyncLocalStorage<Contexto>();

export const contextoActual = <T extends Contexto>(): T | undefined => almacen.getStore() as T | undefined;

/** Corre `fn` con el contexto puesto. Todo lo que llame dentro lo ve. */
export function conContexto<T>(ctx: Contexto, fn: () => T): T {
  return almacen.run(ctx, fn);
}

/**
 * Envuelve el cliente base para que, **dentro** de una petición, las consultas vayan al
 * cliente de esa petición.
 *
 * La regla que hace que esto no rompa los tests, y que es lo que más cuesta acertar:
 *
 *   **Sin contexto, transparencia TOTAL.**
 *
 * Se devuelve la propiedad del cliente base *sin ligar*, preservando la identidad de los
 * métodos. Si se ligara siempre, `db.select === db.select` daría falso y cualquier espía o
 * simulacro de los tests dejaría de reconocerlo. El proxy sería correcto y la suite entera
 * se caería sin que nadie entendiera por qué.
 */
export function clienteConContexto<T extends object>(base: T): T {
  return new Proxy(base, {
    get(destino, prop) {
      const ctx = almacen.getStore();
      if (!ctx?.db) return Reflect.get(destino, prop);        // ← transparencia total
      const valor = (ctx.db as Record<string | symbol, unknown>)[prop];
      // Ligado al cliente de la petición: si no, `this` apunta al base y se pierde el
      // sentido de haberlo enrutado.
      return typeof valor === 'function' ? (valor as (...a: unknown[]) => unknown).bind(ctx.db) : valor;
    },
  }) as T;
}

/**
 * Middleware. Abre un cliente para la petición, fija lo que la base necesite saber del
 * cliente y corre el resto dentro del contexto.
 *
 * `crearCliente` y `fijarAmbito` los pone cada proyecto: con aislamiento por filas,
 * `fijarAmbito` hace el `set_config` que leen las políticas.
 */
export function middlewareDeContexto<TDb>(opciones: {
  tomarCliente: () => Promise<{ cliente: unknown; soltar: () => void }>;
  crearDb: (cliente: unknown) => TDb;
  fijarAmbito?: (cliente: unknown, req: { usuario?: unknown; clienteId?: string | number }) => Promise<void>;
  leerAmbito: (req: unknown) => { usuario?: unknown; clienteId?: string | number; idPeticion?: string };
}) {
  return async (req: never, res: { on: (e: string, f: () => void) => void }, next: () => void) => {
    const ambito = opciones.leerAmbito(req);
    const { cliente, soltar } = await opciones.tomarCliente();
    let soltado = false;
    // El cliente se devuelve al pozo cuando la respuesta termina, pase lo que pase.
    // Sin esto, una petición que falla se lleva un cliente para siempre y el pozo se
    // agota en horas — un fallo que en desarrollo no se ve nunca.
    const devolver = () => { if (!soltado) { soltado = true; soltar(); } };
    res.on('finish', devolver);
    res.on('close', devolver);
    try {
      if (opciones.fijarAmbito) await opciones.fijarAmbito(cliente, ambito);
      conContexto({ db: opciones.crearDb(cliente), ...ambito }, next);
    } catch (e) {
      devolver();
      throw e;
    }
  };
}
