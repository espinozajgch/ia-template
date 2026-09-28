import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Sesiones: el criterio común, en piezas puras que cada proyecto conecta a su almacén.
 *
 * Sale de comparar las cinco implementaciones que había el 2026-09-28 (ElevenOffice,
 * futbot-web-app, Pulso, hipismo y Logroño United). Ninguna cumplía todo, y cada regla de
 * aquí la tenía bien al menos una. El detalle, con la tabla de quién cumplía qué, está en
 * PACK.md § Sesiones.
 *
 * Lo que este fichero NO hace es guardar nada: la tabla, la ORM y el framework son de cada
 * proyecto. Decide cómo se genera un testigo, qué se guarda de él, cómo se llama y se
 * escribe la cookie, cuándo caduca una sesión y si una petición viene del propio sitio.
 */

// ── El testigo ──────────────────────────────────────────────────────────────────────

/** 32 bytes aleatorios en base64url: 43 caracteres, 256 bits. Un UUID tiene 122. */
export function nuevoTestigo(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Lo que se guarda en la base es ESTO, nunca el testigo. Quien lea la tabla —un respaldo,
 * un volcado, una consulta de soporte— no obtiene sesiones utilizables. Un UUID como
 * clave primaria de `sessions` es exactamente el testigo en claro.
 */
export function huellaDeTestigo(testigo: string): string {
  return createHash("sha256").update(testigo).digest("hex");
}

/**
 * ¿Tiene forma de testigo? Se comprueba ANTES de consultar la base: una cookie manipulada
 * no debe llegar a la consulta, donde un tipo inesperado se convierte en un 500 en vez
 * de un 401.
 */
export function tieneFormaDeTestigo(valor: unknown): valor is string {
  return typeof valor === "string" && /^[A-Za-z0-9_-]{43}$/.test(valor);
}

/** Comparación de huellas en tiempo constante, por si un almacén no busca por igualdad. */
export function mismaHuella(a: string, b: string): boolean {
  const x = Buffer.from(a, "hex");
  const y = Buffer.from(b, "hex");
  return x.length === y.length && x.length > 0 && timingSafeEqual(x, y);
}

// ── La cookie ───────────────────────────────────────────────────────────────────────

export type OpcionesDeCookie = {
  /**
   * Si se envía sólo por HTTPS. Se decide por CONFIGURACIÓN del despliegue, nunca por
   * cabeceras de la petición (manipulables). En `http://localhost` tiene que ser falso o
   * el navegador descarta la cookie y nadie puede entrar.
   */
  segura: boolean;
  /** `Lax` por defecto; `Strict` si no hay enlaces entrantes que deban llegar ya dentro. */
  sameSite?: "Lax" | "Strict";
};

/**
 * `__Host-` ata la cookie al origen: el navegador sólo la acepta con `Secure`, `Path=/` y
 * sin `Domain`, y así un subdominio comprometido no puede escribir la sesión del dominio
 * principal. Sólo con `segura`: el prefijo sin `Secure` hace que el navegador DESCARTE la
 * cookie entera, y el síntoma es volver a la pantalla de entrada sin ningún error (hipismo).
 */
export function nombreDeCookie(base: string, segura: boolean): string {
  return segura ? `__Host-${base}` : base;
}

function atributos(opciones: OpcionesDeCookie): string[] {
  const partes = ["Path=/", "HttpOnly", `SameSite=${opciones.sameSite ?? "Lax"}`];
  if (opciones.segura) partes.push("Secure");
  return partes;
}

/** La cabecera `Set-Cookie` de la sesión. `maxAgeS` debe ser el MISMO que la caducidad guardada. */
export function cookieDeSesion(nombre: string, testigo: string, maxAgeS: number, opciones: OpcionesDeCookie): string {
  return [`${nombre}=${testigo}`, ...atributos(opciones), `Max-Age=${Math.max(0, Math.floor(maxAgeS))}`].join("; ");
}

/**
 * La cabecera que la borra. Con los MISMOS atributos con los que se emitió: si no
 * coinciden, el navegador conserva la cookie y la sesión parece no cerrarse (hipismo).
 */
export function cookieBorrada(nombre: string, opciones: OpcionesDeCookie): string {
  return [`${nombre}=`, ...atributos(opciones), "Max-Age=0"].join("; ");
}

// ── La caducidad ────────────────────────────────────────────────────────────────────

export type Politica = {
  /** Sin actividad durante este tiempo, la sesión caduca. Se renueva con cada petición. */
  inactividadMs: number;
  /**
   * Pase lo que pase, la sesión no vive más de esto desde que se creó. Sin este techo,
   * una pestaña abierta con una caducidad deslizante no caduca nunca (hipismo).
   */
  maximoMs: number;
};

/** 12 horas de inactividad, 7 días en total. Cada proyecto ajusta las suyas. */
export const POLITICA_POR_DEFECTO: Politica = { inactividadMs: 12 * 3600_000, maximoMs: 7 * 24 * 3600_000 };

export type Vigencia =
  | { vigente: true; expiraEn: number }
  | { vigente: false; motivo: "inactividad" | "maximo" };

/**
 * ¿Sigue viva la sesión, y hasta cuándo? `expiraEn` es la nueva caducidad a guardar Y a
 * escribir en la cookie a la vez: renovar una y no la otra cierra sesiones que el
 * servidor da por vivas (hipismo).
 */
export function vigencia(
  sesion: { creadaEn: number; ultimaActividad: number },
  ahora: number,
  politica: Politica = POLITICA_POR_DEFECTO,
): Vigencia {
  const limite = sesion.creadaEn + politica.maximoMs;
  if (ahora >= limite) return { vigente: false, motivo: "maximo" };
  if (ahora >= sesion.ultimaActividad + politica.inactividadMs) return { vigente: false, motivo: "inactividad" };
  return { vigente: true, expiraEn: Math.min(ahora + politica.inactividadMs, limite) };
}

// ── El origen (CSRF) ────────────────────────────────────────────────────────────────

/**
 * ¿Viene del propio sitio? `SameSite` no basta en todos los casos ni en todos los
 * navegadores, así que las escrituras lo comprueban además (Pulso). Se acepta si el
 * navegador dice que es del mismo origen, o si `Origin` coincide con `Host`. Sin ninguna
 * de las dos cabeceras —curl, un script— tampoco viajan cookies de nadie: no se bloquea.
 */
export function mismoOrigen(cabecera: (nombre: string) => string | null | undefined): boolean {
  const sitio = cabecera("sec-fetch-site");
  if (sitio) return sitio === "same-origin" || sitio === "none";
  const origen = cabecera("origin");
  if (!origen) return true;
  const host = cabecera("host");
  try {
    return Boolean(host) && new URL(origen).host === host;
  } catch {
    return false;
  }
}
