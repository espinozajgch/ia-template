import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Segundo factor por código temporal (TOTP, RFC 6238).
 *
 * Portado de una implementación real. Es el único proyecto de la cantera que lo tiene,
 * y el que más datos personales maneja no lo tiene — de ahí que suba al kit.
 *
 * Se implementa aquí, con `node:crypto` y sin dependencias: son cuarenta líneas
 * de aritmética y un HMAC, y una biblioteca de terceros para esto es superficie
 * de suministro a cambio de nada. El algoritmo está publicado —RFC 6238 sobre
 * RFC 4226— y lo entienden todas las aplicaciones de autenticación.
 *
 * **Por qué TOTP y no un código por SMS o por correo:** porque no exige mandar
 * nada por ningún canal, y el canal es justo lo que suele fallar. Un segundo
 * factor que depende de un mensaje que a veces no llega no es un segundo factor,
 * es una forma nueva de quedarse fuera. Además el SMS es interceptable por
 * duplicado de tarjeta, que es un ataque real y barato.
 */

/** Alfabeto base32 de RFC 4648, que es el que leen las aplicaciones. */
const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** Ventana de cada código, en segundos. Treinta es lo que espera todo el mundo. */
export const PASO = 30;

/**
 * Cuántas ventanas de tolerancia hacia atrás y hacia delante.
 *
 * Una a cada lado. Sin tolerancia, un reloj desfasado veinte segundos —lo
 * normal en un teléfono— haría fallar códigos correctos y la gente
 * desactivaría el segundo factor. Con más de una, la ventana de un código
 * robado se estira sin necesidad.
 */
export const TOLERANCIA = 1;

export const DIGITOS = 6;

/** Un secreto nuevo, en base32. Veinte bytes es lo que recomienda la RFC 4226. */
export function secretoNuevo(bytes = 20): string {
  return aBase32(randomBytes(bytes));
}

export function aBase32(datos: Uint8Array): string {
  let bits = 0;
  let valor = 0;
  let salida = "";
  for (const byte of datos) {
    valor = (valor << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      salida += BASE32[(valor >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) salida += BASE32[(valor << (5 - bits)) & 31];
  return salida;
}

export function deBase32(texto: string): Buffer {
  const limpio = texto.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let valor = 0;
  const salida: number[] = [];
  for (const c of limpio) {
    const indice = BASE32.indexOf(c);
    if (indice < 0) continue;
    valor = (valor << 5) | indice;
    bits += 5;
    if (bits >= 8) {
      salida.push((valor >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(salida);
}

/** El período en el que cae un instante. Es lo que se firma. */
export function pasoDe(instante = Date.now()): number {
  return Math.floor(instante / 1000 / PASO);
}

/**
 * El código de un período. HMAC-SHA1 y truncado dinámico, como manda la RFC.
 *
 * SHA-1 no es una elección de seguridad discutible aquí: es lo que especifica
 * HOTP y lo que implementan las aplicaciones. Cambiarlo por SHA-256 daría
 * códigos que ningún autenticador reconoce.
 */
export function codigoDe(secreto: string, paso: number): string {
  const contador = Buffer.alloc(8);
  contador.writeBigUInt64BE(BigInt(paso));
  const mac = createHmac("sha1", deBase32(secreto)).update(contador).digest();
  // El truncado dinámico de la RFC 4226: el último nibble dice por dónde cortar cuatro
  // bytes, y el bit más alto se descarta para que no salga un número negativo.
  //
  // Se lee con los métodos del Buffer y no indexando: con SHA-1 el resumen mide siempre 20
  // bytes y el desplazamiento cae entre 0 y 15, así que los cuatro bytes existen SIEMPRE
  // —pero esa garantía estaba solo en la cabeza de quien lo escribió. `readUInt32BE`
  // comprueba los límites y REVIENTA si algún día deja de ser cierta; indexar devolvía
  // `undefined`, y `undefined & 0xff` es 0: un código de seis dígitos perfectamente
  // plausible y perfectamente equivocado. Un fallo así en un segundo factor no se ve, se
  // padece.
  const desplazamiento = mac.readUInt8(mac.length - 1) & 0x0f;
  const truncado = mac.readUInt32BE(desplazamiento) & 0x7fff_ffff;
  return String(truncado % 10 ** DIGITOS).padStart(DIGITOS, "0");
}

/**
 * Comprueba un código y devuelve **el período en el que valió**, o `null`.
 *
 * Devolver el período y no un booleano no es un capricho: es lo que permite
 * guardar el último usado y rechazar el mismo código dos veces. Sin eso, quien
 * mira por encima del hombro tiene treinta segundos para usarlo él.
 *
 * La comparación es de tiempo constante. Comparar códigos con `===` filtra por
 * el tiempo de respuesta cuántos dígitos iniciales se acertaron, y seis dígitos
 * no dan tanto margen como para regalarlo.
 */
export function comprobar(
  secreto: string,
  codigo: unknown,
  opciones: { ahora?: number; ultimoPaso?: number | null } = {},
): number | null {
  const limpio = String(codigo ?? "").replace(/\D/g, "");
  if (limpio.length !== DIGITOS) return null;

  const actual = pasoDe(opciones.ahora ?? Date.now());
  for (let d = -TOLERANCIA; d <= TOLERANCIA; d += 1) {
    const paso = actual + d;
    /* Un período ya usado no vuelve a valer, ni siquiera dentro de su ventana. */
    if (opciones.ultimoPaso != null && paso <= opciones.ultimoPaso) continue;
    if (igual(codigoDe(secreto, paso), limpio)) return paso;
  }
  return null;
}

function igual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * La URI que lee un lector de código QR.
 *
 * El emisor y la cuenta salen escapados: un nombre de empresa con dos puntos
 * —que es legal— partiría la URI y la aplicación mostraría una cuenta con otro
 * nombre.
 */
export function uriDeAutenticacion(datos: { emisor: string; cuenta: string; secreto: string }): string {
  const etiqueta = `${encodeURIComponent(datos.emisor)}:${encodeURIComponent(datos.cuenta)}`;
  const parametros = new URLSearchParams({
    secret: datos.secreto,
    issuer: datos.emisor,
    algorithm: "SHA1",
    digits: String(DIGITOS),
    period: String(PASO),
  });
  return `otpauth://totp/${etiqueta}?${parametros.toString()}`;
}

/* --------------------------------------------------------- Códigos de respaldo */

export const RESPALDOS = 8;

/**
 * Códigos de un solo uso para cuando no se tiene el teléfono delante.
 *
 * Sin ellos, perder el móvil es perder la cuenta, y la única salida sería que
 * alguien con acceso a la base la desactivara a mano. Se enseñan **una vez** y
 * se guardan hasheados: funcionan exactamente como contraseñas.
 */
export function respaldosNuevos(cuantos = RESPALDOS): string[] {
  return Array.from({ length: cuantos }, () => {
    const bruto = randomBytes(5).toString("hex").toUpperCase();
    return `${bruto.slice(0, 5)}-${bruto.slice(5, 10)}`;
  });
}

export function normalizarRespaldo(codigo: unknown): string {
  return String(codigo ?? "").toUpperCase().replace(/[^A-F0-9]/g, "");
}
