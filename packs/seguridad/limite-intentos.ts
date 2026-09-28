import { createHash } from "node:crypto";

/**
 * Límite de intentos de acceso: el criterio común, en piezas puras.
 *
 * Sale de comparar las seis implementaciones que había el 2026-09-28 (ElevenOffice,
 * futbot-web-app, Pulso, hipismo —dos— y Logroño United). La más completa era la de
 * Pulso; de ella salen la decisión pura, la espera creciente, el desbloqueo sin tocar la
 * contraseña y el cupo de derivaciones. Tres mejoras vienen de las otras: la clave
 * guardada como huella (Logroño), contar sólo el 401 (hipismo) y acotar el exponente antes
 * de elevar. El porqué de cada regla, en PACK.md § Intentos de acceso.
 *
 * El registro atómico del fallo vive en la base (`limite-intentos.sql`): leer, decidir y
 * escribir desde el proceso deja que dos peticiones simultáneas sumen uno en vez de dos.
 */

export type PoliticaDeIntentos = {
  /** Fallos por cuenta antes de bloquear. Es el que de verdad frena la prueba de contraseñas. */
  maximoPorCuenta: number;
  /** Fallos por IP. Sólo se usa si la IP es atribuible (proxy de confianza declarado). */
  maximoPorIp: number;
  /** Pasada la ventana sin bloqueo vigente, el contador vuelve a empezar. */
  ventanaMs: number;
  /** Primera espera; cada fallo más la dobla. */
  esperaBaseMs: number;
  /** Techo de la espera: quien conoce un correo ajeno retrasa a su dueño, no lo echa. */
  esperaTechoMs: number;
};

export const POLITICA_DE_INTENTOS: PoliticaDeIntentos = {
  maximoPorCuenta: 5,
  maximoPorIp: 20,
  ventanaMs: 15 * 60_000,
  esperaBaseMs: 60_000,
  esperaTechoMs: 60 * 60_000,
};

/** Espera tras `sobrantes` fallos por encima del máximo: 1, 2, 4, 8… minutos, con techo. */
export function esperaMs(sobrantes: number, p: PoliticaDeIntentos = POLITICA_DE_INTENTOS): number {
  // Se acota el exponente ANTES de elevar: 2^1000 es Infinity, y en SQL, un desbordamiento.
  const pasos = Math.ceil(Math.log2(p.esperaTechoMs / p.esperaBaseMs));
  const exponente = Math.min(Math.max(0, sobrantes), Math.max(0, pasos));
  return Math.min(p.esperaTechoMs, p.esperaBaseMs * 2 ** exponente);
}

export type Registro = { intentos: number; desde: number; bloqueadoHasta: number | null };
export type Veredicto = { permitido: true } | { permitido: false; segundos: number };

/**
 * Decisión sobre un registro ya leído. Separada del acceso a datos para probarla con un
 * reloj inyectado: la regla es lo que se equivoca, no el `SELECT`. Se consulta ANTES de
 * verificar la contraseña: un intento bloqueado no debe costar una derivación.
 */
export function veredicto(
  registro: Registro | null,
  maximo: number,
  ahora: number,
  p: PoliticaDeIntentos = POLITICA_DE_INTENTOS,
): Veredicto {
  if (!registro) return { permitido: true };
  if (registro.bloqueadoHasta !== null && registro.bloqueadoHasta > ahora)
    return { permitido: false, segundos: Math.ceil((registro.bloqueadoHasta - ahora) / 1000) };
  if (ahora - registro.desde > p.ventanaMs) return { permitido: true };
  if (registro.intentos >= maximo)
    return { permitido: false, segundos: Math.ceil(esperaMs(registro.intentos - maximo, p) / 1000) };
  return { permitido: true };
}

/**
 * Las claves que gobiernan un intento, ya como huella: la tabla no guarda ningún correo
 * en claro (Logroño). `ambito` separa, por ejemplo, el acceso del personal del de
 * clientes. La IP se pasa SÓLO si es atribuible: sin un proxy de confianza declarado, la
 * que llega puede ser la del balanceador, y un contador compartido por todo el mundo
 * niega el acceso a todo el mundo (Pulso lo midió el 2026-08-19).
 */
export function clavesDeIntento(
  intento: { ambito: string; identificador: string; ipAtribuible?: string | null },
  p: PoliticaDeIntentos = POLITICA_DE_INTENTOS,
): { clave: string; maximo: number }[] {
  const huella = (texto: string) => createHash("sha256").update(texto).digest("hex");
  const claves = [{ clave: huella(`cuenta:${intento.ambito}:${intento.identificador.trim().toLowerCase()}`), maximo: p.maximoPorCuenta }];
  if (intento.ipAtribuible) claves.push({ clave: huella(`ip:${intento.ipAtribuible}`), maximo: p.maximoPorIp });
  return claves;
}

/**
 * ¿Esta respuesta es un intento de adivinar la contraseña? Sólo el 401. Un cuerpo mal
 * formado (400), una empresa desactivada (403) o el propio bloqueo (429) no gastan
 * intentos: quien escribe bien su clave y se encuentra la empresa apagada no debe
 * acabar bloqueado por un problema que no es suyo (hipismo).
 */
export const cuentaComoFallo = (status: number) => status === 401;

// ── Cupo de derivaciones ────────────────────────────────────────────────────────────

/** Lo que devuelve el cupo cuando la petición agotó su espera. No deja estado ni bloqueo. */
export const SIN_CUPO: unique symbol = Symbol("sin-cupo");

/**
 * Cuántas derivaciones de contraseña corren a la vez en ESTE proceso. Proteger la CPU y
 * la memoria (argon2id reserva 64 MiB) es otro problema que frenar la prueba de
 * contraseñas, y se resuelve aparte: un contador común en la base, para esto, convierte a
 * cualquier anónimo en capaz de bloquear a todo el mundo (Pulso). Cuando se llena, la
 * petición espera su turno; si la espera se agota, se rechaza ESA petición y sólo esa.
 */
export function crearCupo(maximo = 4, esperaMaximaMs = 2000) {
  let enCurso = 0;
  const cola: (() => void)[] = [];

  function turno(): Promise<boolean> {
    if (enCurso < maximo) { enCurso += 1; return Promise.resolve(true); }
    return new Promise((resolver) => {
      const entrar = () => { clearTimeout(temporizador); enCurso += 1; resolver(true); };
      const temporizador = setTimeout(() => {
        const i = cola.indexOf(entrar);
        if (i >= 0) cola.splice(i, 1);
        resolver(false);
      }, esperaMaximaMs);
      cola.push(entrar);
    });
  }

  return {
    async con<T>(trabajo: () => Promise<T>): Promise<T | typeof SIN_CUPO> {
      if (!(await turno())) return SIN_CUPO;
      try {
        return await trabajo();
      } finally {
        enCurso -= 1;
        cola.shift()?.(); // el turno pasa en el mismo tick: nadie se cuela entre medias
      }
    },
    estado: () => ({ enCurso, esperando: cola.length }),
  };
}
