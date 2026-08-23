/**
 * Bandeja de salida: lo capturado sin conexión, esperando a que vuelva la red.
 *
 * Generalizado de una implementación real en una aplicación clínica, donde el personal
 * captura fichas y resultados en sitios sin cobertura.
 *
 * ── Las cuatro decisiones, y por qué cada una ────────────────────────────────
 *
 * 1 · LISTA BLANCA. Lo que no está declarado NO se encola. Al revés —encolar todo salvo
 *     lo prohibido— cada acción nueva que alguien añada quedaría encolable sin que nadie
 *     lo haya pensado, y la que se colara sería justo la que no debía: la que consume un
 *     correlativo o la que promete algo a un tercero.
 *
 * 2 · FIFO ESTRICTA, no «reintentar lo que se pueda». Hay causalidad entre lo capturado:
 *     la corrección de una ficha va después de su alta. Enviar en desorden produce
 *     escrituras que se pisan, y lo peor es que se pisan en silencio.
 *
 * 3 · UNA RECHAZADA DETIENE LA COLA. Las que van detrás no se saltan: se quedan
 *     detenidas y se enseñan. Saltar la rechazada y seguir enviando es exactamente cómo
 *     se aplica una corrección sobre un alta que nunca entró.
 *
 * 4 · REFERENCIAS PROVISIONALES CON PREFIJO DE TEXTO. Un alta hecha sin conexión no tiene
 *     identificador: lo pone el servidor. Hasta entonces se usa `tmp:…`, y es una cadena
 *     —no un número negativo ni un cero— para que sea **imposible de confundir** con un
 *     identificador real. Si una referencia sin resolver se cuela hasta el servidor, un
 *     número falla de formas creativas; una cadena la rechaza el validador en el primer paso.
 */

export type Estado = 'pendiente' | 'enviando' | 'aplicada' | 'rechazada' | 'detenida';

export type Entrada = {
  /** Viaja con la petición: es lo que impide que se aplique dos veces. */
  idMutacion: string;
  ruta: string;
  accion: string;
  cuerpo: unknown;
  creadaEn: number;
  estado: Estado;
  intentos: number;
  error?: string;
};

/** Qué se puede capturar sin conexión. Lo que no esté aquí, no se encola. */
export type ListaBlanca = Record<string, readonly string[]>;

export const puedeEncolarse = (lista: ListaBlanca, ruta: string, accion: string): boolean =>
  (lista[ruta] ?? []).includes(accion);

// ── Referencias provisionales ─────────────────────────────────────────────────
export const PROVISIONAL = 'tmp:';
export const esProvisional = (v: unknown): v is string =>
  typeof v === 'string' && v.startsWith(PROVISIONAL);

export function referenciaProvisional(): string {
  const c = globalThis.crypto;
  return PROVISIONAL + (c?.randomUUID ? c.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
}

/**
 * Sustituye las referencias provisionales ya resueltas dentro de un cuerpo.
 * Recorre en profundidad porque la referencia puede estar anidada.
 */
export function resolverReferencias(cuerpo: unknown, mapa: Map<string, string | number>): unknown {
  if (esProvisional(cuerpo)) return mapa.get(cuerpo) ?? cuerpo;
  if (Array.isArray(cuerpo)) return cuerpo.map(v => resolverReferencias(v, mapa));
  if (cuerpo && typeof cuerpo === 'object') {
    return Object.fromEntries(
      Object.entries(cuerpo as Record<string, unknown>).map(([k, v]) => [k, resolverReferencias(v, mapa)]),
    );
  }
  return cuerpo;
}

/** ¿Queda alguna referencia sin resolver? Si la hay, la entrada NO puede salir. */
export function tieneProvisionalesSinResolver(cuerpo: unknown): boolean {
  if (esProvisional(cuerpo)) return true;
  if (Array.isArray(cuerpo)) return cuerpo.some(tieneProvisionalesSinResolver);
  if (cuerpo && typeof cuerpo === 'object') return Object.values(cuerpo as Record<string, unknown>).some(tieneProvisionalesSinResolver);
  return false;
}

// ── El almacén ────────────────────────────────────────────────────────────────
/**
 * Dónde vive la cola. Se inyecta para poder probar sin navegador — y porque lo que hay
 * aquí suele ser **más** sensible que la copia de lectura: es lo único que existe de ese
 * trabajo. En producción, cifrado.
 */
export type Almacen = {
  leer(): Promise<Entrada[]>;
  escribir(entradas: Entrada[]): Promise<void>;
};

export type ResultadoEnvio =
  | { tipo: 'aplicada'; idReal?: string | number }
  | { tipo: 'reintentar'; error: string }      // fallo temporal: sigue en cola
  | { tipo: 'rechazada'; error: string };      // definitivo: detiene lo que va detrás

export type Enviar = (e: Entrada) => Promise<ResultadoEnvio>;

export function crearCola(almacen: Almacen, lista: ListaBlanca) {
  return {
    async encolar(ruta: string, accion: string, cuerpo: unknown, idMutacion?: string): Promise<Entrada> {
      if (!puedeEncolarse(lista, ruta, accion)) {
        throw new Error(`"${accion}" sobre "${ruta}" no está declarada como encolable: exige conexión`);
      }
      const entrada: Entrada = {
        idMutacion: idMutacion ?? referenciaProvisional().slice(PROVISIONAL.length),
        ruta, accion, cuerpo, creadaEn: Date.now(), estado: 'pendiente', intentos: 0,
      };
      const cola = await almacen.leer();
      await almacen.escribir([...cola, entrada]);
      return entrada;
    },

    async pendientes(): Promise<Entrada[]> {
      return (await almacen.leer()).filter(e => e.estado === 'pendiente' || e.estado === 'detenida');
    },

    /**
     * Vacía la cola en orden. Se detiene en la primera rechazada y marca **detenidas** las
     * que van detrás: no se saltan.
     *
     * Devuelve qué pasó, para poder enseñarlo. Una cola que falla en silencio es peor que
     * no tenerla: el usuario cree que su trabajo se envió.
     */
    async vaciar(enviar: Enviar) {
      const cola = await almacen.leer();
      const resueltas = new Map<string, string | number>();
      let aplicadas = 0, detenida = false;

      for (const e of cola) {
        if (e.estado === 'aplicada' || e.estado === 'rechazada') continue;
        if (detenida) { e.estado = 'detenida'; continue; }

        e.cuerpo = resolverReferencias(e.cuerpo, resueltas);
        if (tieneProvisionalesSinResolver(e.cuerpo)) {
          // Depende de un alta que no ha entrado. Detiene, no se salta.
          e.estado = 'detenida';
          e.error = 'depende de un registro que aún no se ha creado';
          detenida = true;
          continue;
        }

        e.estado = 'enviando';
        e.intentos++;
        const r = await enviar(e);
        if (r.tipo === 'aplicada') {
          e.estado = 'aplicada';
          aplicadas++;
          if (r.idReal !== undefined) resueltas.set(PROVISIONAL + e.idMutacion, r.idReal);
        } else if (r.tipo === 'reintentar') {
          e.estado = 'pendiente';
          e.error = r.error;
          detenida = true;      // el orden importa: no se adelanta la siguiente
        } else {
          e.estado = 'rechazada';
          e.error = r.error;
          detenida = true;
        }
      }
      await almacen.escribir(cola);
      return {
        aplicadas,
        pendientes: cola.filter(e => e.estado === 'pendiente').length,
        detenidas: cola.filter(e => e.estado === 'detenida').length,
        rechazadas: cola.filter(e => e.estado === 'rechazada').length,
      };
    },

    /** Quita las aplicadas. Las rechazadas se conservan hasta que alguien las mire. */
    async limpiar() {
      const cola = await almacen.leer();
      await almacen.escribir(cola.filter(e => e.estado !== 'aplicada'));
    },

    /** Descarta una rechazada, a petición de una persona, y libera lo que va detrás. */
    async descartar(idMutacion: string) {
      const cola = await almacen.leer();
      await almacen.escribir(
        cola.filter(e => e.idMutacion !== idMutacion)
            .map(e => (e.estado === 'detenida' ? { ...e, estado: 'pendiente' as const, error: undefined } : e)),
      );
    },
  };
}
