import { createPublicKey } from "node:crypto";

/**
 * Validación de una suscripción Web Push ANTES de guardarla.
 *
 * Una suscripción es una URL a la que el servidor va a hacer peticiones firmadas. Si se
 * acepta «cualquier https://» —lo que hacían tres de los cuatro proyectos con push el
 * 2026-09-28—, cualquier usuario autenticado registra la URL de un servicio interno y el
 * servidor la llama por él: es un SSRF con la puerta abierta desde el navegador. La
 * defensa es una **lista cerrada** de servicios push; ningún navegador real usa otro.
 *
 * Portado de futbot-web-app (`backend/web_push.py`), el único de los cuatro que la tenía,
 * con una corrección: Edge entrega endpoints en `*.notify.windows.com`, no en
 * `*.wns.windows.com`, y con aquella lista sus usuarios no podían suscribirse.
 *
 * Sin dependencias: `node:crypto` comprueba que `p256dh` es un punto real de la curva.
 */

/** Anfitriones exactos de los servicios push, y los que admiten subdominios. */
export const SERVICIOS_PUSH = [
  "fcm.googleapis.com",              // Chrome, Android, Opera, Samsung Internet
  "updates.push.services.mozilla.com", // Firefox
  "web.push.apple.com",              // Safari (macOS 13+, iOS 16.4+)
] as const;
export const DOMINIOS_PUSH = [
  "notify.windows.com",              // Edge: wns2-xxx.notify.windows.com
  "push.apple.com",                  // Safari, si Apple reparte por subdominios
] as const;

export const ENDPOINT_MAXIMO = 4096;

export type SuscripcionPush = { endpoint: string; keys: { p256dh: string; auth: string } };

export class SuscripcionInvalida extends Error {}

/** Prefijo DER de una clave pública P-256 sin comprimir: lo que falta para que `node:crypto` la lea. */
const SPKI_P256 = Buffer.from("3059301306072a8648ce3d020106082a8648ce3d030107034200", "hex");

const base64url = (valor: string) => Buffer.from(valor, "base64url");

export function servicioAdmitido(anfitrion: string, extra: readonly string[] = []): boolean {
  const host = anfitrion.toLowerCase();
  return [...SERVICIOS_PUSH, ...extra].includes(host)
    || DOMINIOS_PUSH.some((dominio) => host === dominio || host.endsWith(`.${dominio}`));
}

/**
 * Devuelve la suscripción normalizada o lanza `SuscripcionInvalida` con un motivo que se
 * puede enseñar. `extra`: anfitriones adicionales, por si un proyecto sirve a un
 * navegador que no está en la lista; cada uno que se añada es una URL más que el servidor
 * aceptará llamar.
 */
export function validarSuscripcion(valor: unknown, extra: readonly string[] = []): SuscripcionPush {
  const v = (valor ?? {}) as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
  const endpoint = typeof v.endpoint === "string" ? v.endpoint : "";
  if (!endpoint || endpoint.length > ENDPOINT_MAXIMO) throw new SuscripcionInvalida("El dispositivo no envió una dirección de notificaciones válida.");

  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    throw new SuscripcionInvalida("El dispositivo no envió una dirección de notificaciones válida.");
  }
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")
      || url.hash || url.pathname.length <= 1 || !servicioAdmitido(url.hostname, extra)) {
    throw new SuscripcionInvalida("El dispositivo no usa un servicio de notificaciones admitido.");
  }

  const { p256dh, auth } = v.keys ?? {};
  if (typeof p256dh !== "string" || typeof auth !== "string" || p256dh.length > 200 || auth.length > 200) {
    throw new SuscripcionInvalida("Las claves del dispositivo no son válidas.");
  }
  const punto = base64url(p256dh);
  try {
    if (punto.length !== 65 || punto[0] !== 0x04) throw new Error("forma");
    createPublicKey({ key: Buffer.concat([SPKI_P256, punto]), format: "der", type: "spki" });
  } catch {
    throw new SuscripcionInvalida("Las claves del dispositivo no son válidas.");
  }
  if (base64url(auth).length !== 16) throw new SuscripcionInvalida("Las claves del dispositivo no son válidas.");

  return { endpoint, keys: { p256dh, auth } };
}
