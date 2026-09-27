import { hash, verify } from "@node-rs/argon2";

/**
 * Contraseñas: un solo algoritmo, un solo formato, en todos los proyectos.
 *
 * Existe porque el 2026-09-27 los cinco proyectos con cuentas guardaban contraseñas de
 * cinco maneras: bcrypt en dos, PBKDF2 en otro, scrypt en otro y argon2 en el último.
 * La culpa era del kit: su checklist decía «Argon2id o bcrypt», y una regla con dos
 * respuestas no es una regla. Cada proyecto eligió la suya, dos quedaron por debajo del
 * mínimo de OWASP y ninguno podía reutilizar lo que había hecho otro.
 *
 * **Argon2id**, porque es la primera recomendación de OWASP y de la RFC 9106: además de
 * CPU, cuesta memoria, y la memoria es lo que no se abarata en una GPU.
 *
 * **Formato PHC** (`$argon2id$v=19$m=65536,t=3,p=4$<sal>$<hash>`), porque lleva dentro el
 * algoritmo, los parámetros y la sal. Un hash se verifica solo, sin columna de sal aparte
 * ni constantes que recordar, y el mismo texto lo lee cualquier biblioteca de cualquier
 * lenguaje: `contrasenas.py` verifica lo que escribe este fichero, y al revés.
 *
 * Paridad Python: `contrasenas.py`, con los mismos parámetros y la misma interfaz.
 */

/**
 * 64 MiB, 3 pasadas, 4 carriles: la segunda recomendación de la RFC 9106 y los valores por
 * defecto de `argon2` (Node) y `argon2-cffi` (Python). Coincidir con los valores por
 * defecto no es casualidad: un proyecto que llame a la biblioteca sin parámetros produce el
 * mismo hash que éste, y no queda marcado para re-hash.
 *
 * Coste: unos 20 ms y 64 MiB por inicio de sesión (medido en un Apple M; más en una vCPU
 * compartida). Diez inicios simultáneos son 640 MiB, así que el login **tiene** que ir
 * detrás de un limitador de intentos y de un cupo de derivaciones simultáneas; sin ellos,
 * esto es también una puerta para tumbar el servidor.
 */
export const PARAMETROS = { memoryCost: 65536, timeCost: 3, parallelism: 4 } as const;

/**
 * Más larga que esto no se deriva. Argon2 no tiene el tope de 72 bytes de bcrypt, así que
 * el límite es sólo para no aceptar un megabyte como contraseña.
 */
export const LONGITUD_MAXIMA = 1024;

export type Comprobacion = { valida: boolean; necesitaRehash: boolean };

/**
 * Un formato anterior que el proyecto todavía sabe leer, sólo para verificar.
 *
 * Así se migra sin pedir a nadie que cambie la contraseña: la cuenta entra con su hash
 * viejo, `verificarContrasena` devuelve `necesitaRehash`, y el proyecto guarda en ese
 * momento `hashContrasena(password)`. Cuando ya no queda ningún hash con ese formato en la
 * base, se borra el `Legado` y con él la última línea de bcrypt o PBKDF2 del proyecto.
 */
export type Legado = {
  nombre: string;
  reconoce(almacenado: string): boolean;
  verificar(password: string, almacenado: string): Promise<boolean>;
};

export async function hashContrasena(password: string): Promise<string> {
  if (password.length > LONGITUD_MAXIMA) throw new RangeError("Contraseña demasiado larga.");
  return hash(password, PARAMETROS);
}

export async function verificarContrasena(
  password: string,
  almacenado: string,
  legados: readonly Legado[] = [],
): Promise<Comprobacion> {
  const no = { valida: false, necesitaRehash: false };
  if (password.length > LONGITUD_MAXIMA || !almacenado) return no;

  if (almacenado.startsWith("$argon2")) {
    let valida: boolean;
    try {
      valida = await verify(almacenado, password);
    } catch {
      return no; // un hash malformado no autentica a nadie, ni tumba la petición
    }
    return { valida, necesitaRehash: valida && pordebajo(almacenado) };
  }

  const legado = legados.find((l) => l.reconoce(almacenado));
  if (!legado) return no;
  const valida = await legado.verificar(password, almacenado);
  return { valida, necesitaRehash: valida };
}

/**
 * ¿Este hash argon2 es más débil que el estándar?
 *
 * Sólo «más débil», nunca «distinto»: un hash con más memoria que el estándar no se
 * rebaja. `argon2-cffi` trae `check_needs_rehash`, pero compara por igualdad, y re-hashear
 * hacia abajo es perder seguridad a cambio de uniformidad.
 */
export function pordebajo(almacenado: string): boolean {
  const m = /^\$(argon2(?:id|i|d))\$v=(\d+)\$m=(\d+),t=(\d+),p=(\d+)\$/.exec(almacenado);
  if (!m) return true;
  const [, variante, version, memoria, pasadas] = m;
  return variante !== "argon2id" || Number(version) < 19
    || Number(memoria) < PARAMETROS.memoryCost || Number(pasadas) < PARAMETROS.timeCost;
}

let relleno: Promise<string> | undefined;

/**
 * Gasta lo mismo que una verificación real. Se llama cuando la cuenta no existe.
 *
 * Sin esto, «no existe» responde en 1 ms y «contraseña mala» en 20: cuatro peticiones
 * bastan para saber qué correos están registrados, y en según qué sistema eso ya es un
 * dato personal —quién es paciente de qué centro—. El hash de relleno se calcula una vez
 * por proceso, con los mismos parámetros, así que cuesta exactamente lo mismo.
 */
export async function verificarEnVacio(password: string): Promise<void> {
  relleno ??= hashContrasena("relleno-sin-cuenta");
  // Sin recortar: una contraseña por encima del máximo sale enseguida con cuenta o sin ella.
  // Recortarla aquí haría lo contrario de lo que se busca —trabajo completo sólo sin cuenta—.
  await verificarContrasena(password, await relleno);
}
