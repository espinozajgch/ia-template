/**
 * Registro estructurado con redacción CENTRAL.
 *
 * Portado de una implementación real. Es la pieza que decide si, cuando algo falla en
 * producción, se puede responder «qué le pasó a esta persona a las 11:40» o no.
 *
 * ── La decisión que lo sostiene ──────────────────────────────────────────────
 *
 * **La redacción es central, no disciplina de quien llama.**
 *
 * Si depende de que cada llamada recuerde no pasar el cuerpo de la petición, un día
 * alguien lo pasa — y el pasaporte, el teléfono o el diagnóstico acaban en la salida
 * estándar, de ahí al recolector de registros y de ahí a treinta días de retención.
 * Con la redacción aquí, esa llamada es inofensiva.
 */

// ── Qué se redacta, y por qué en dos niveles ─────────────────────────────────
//
// EXACTO: coincidencia exacta del nombre normalizado. Para nombres CORTOS o ambiguos,
// donde buscar por subcadena destruiría campos legítimos: «ip» está dentro de
// «description», «nie» dentro de «denied».
//
// PARCIAL: coincidencia por subcadena. Solo nombres largos e inequívocos, para cubrir las
// variantes que un conjunto exacto pierde en silencio: `correoUsuario`, `emailContacto`,
// `usuario_email`, `telefonoFijo`.
//
// Un conjunto solo exacto sobre datos personales es **un hueco por diseño**: da sensación
// de cobertura sin tenerla.

const EXACTO = new Set([
  // credenciales y sesión
  'password', 'passwordhash', 'contrasena', 'clave', 'token', 'refreshtoken',
  'accesstoken', 'authorization', 'cookie', 'secret', 'apikey', 'jti', 'otp', 'totp',
  // documentos de identidad: cortos, solo exactos para no colisionar
  'dni', 'nif', 'nie', 'cif', 'rif', 'cuit', 'cuil', 'rfc', 'ssn', 'iban', 'cbu', 'dob',
  // tarjetas
  'pan', 'cvv', 'cvc',
]);

const PARCIAL = [
  // contacto
  'email', 'correo', 'telefono', 'telephone', 'phone', 'whatsapp', 'direccion', 'address',
  // documento de identidad, largos y por tanto seguros por subcadena
  'pasaporte', 'passport',
  // salud: categoría especial en la mayoría de normativas
  'diagnostic', 'historialmedico', 'historiaclinica', 'alergia', 'medicacion', 'lesion',
  // económico del titular
  'salario', 'salary', 'nomina', 'importe', 'saldo', 'tarjeta', 'cardnumber',
  // fecha de nacimiento: identificador indirecto fuerte
  'fechanacimiento', 'birthdate', 'dateofbirth', 'fechanac',
  // texto libre: sumidero de datos personales arbitrarios
  'notas', 'observaciones', 'comentarios',
];

/**
 * Lo que NO se redacta, a propósito, y conviene que esté escrito:
 *
 * · `nombre` y `apellido` — son el principal asidero para depurar, aparecen en decenas de
 *   claves que no son datos personales (`nombreArchivo`, `nombreTabla`) y un nombre sin
 *   contacto ni documento es de sensibilidad media. Redactarlos vacía el registro a cambio
 *   de poco.
 *
 * · `ip` y `userAgent` — son datos personales, pero son el insumo del análisis forense de
 *   un incidente y de las alarmas de fuerza bruta. Redactarlos ciega esas alarmas. El
 *   control correcto sobre ellos es la RETENCIÓN, no la redacción.
 *
 * Las dos decisiones son discutibles y dependen del proyecto. Lo que no es discutible es
 * que estén **decididas y escritas**, en vez de haber pasado sin que nadie lo pensara.
 */
export function esSensible(clave: string): boolean {
  const n = clave.toLowerCase().replace(/[^a-z0-9]/g, '');
  return EXACTO.has(n) || PARCIAL.some(t => n.includes(t));
}

export const REDACTADO = '[REDACTADO]';

/**
 * Serializa sin lanzar nunca.
 *
 * Importa porque el registrador se llama **dentro de los `catch`**: si lanza aquí, tumba
 * el manejador y enmascara el incidente original. Se neutralizan ciclos, `BigInt`,
 * funciones y errores; si todo falla, sale una entrada mínima.
 *
 * ── El detalle fino: un grafo no es un ciclo ─────────────────────────────────
 *
 * Un ciclo es una referencia a un ANCESTRO del camino actual, no «algo ya visto». Con un
 * conjunto global, el mismo objeto en dos ramas —`{ jugador: j, contrato: { jugador: j } }`,
 * o repetido en un array— se marca `[Circular]` siendo perfectamente serializable, y se
 * pierde diagnóstico justo cuando más falta hace.
 *
 * Por eso se rastrea el CAMINO de contenedores: `this` en la función de reemplazo es el
 * objeto que contiene la clave, y permite recortar al desandar una rama.
 */
export function serializarSeguro(obj: unknown): string {
  const camino: unknown[] = [];
  try {
    return JSON.stringify(obj, function (this: unknown, clave, valor) {
      // La redacción va primero, e independiente del tipo del valor.
      if (typeof clave === 'string' && clave && esSensible(clave)) return REDACTADO;
      if (typeof valor === 'bigint') return valor.toString();
      if (typeof valor === 'function') return `[Función ${valor.name || 'anónima'}]`;
      if (valor instanceof Error) return { nombre: valor.name, mensaje: valor.message, stack: valor.stack };
      if (typeof valor === 'object' && valor !== null) {
        const i = camino.lastIndexOf(this);
        camino.length = i >= 0 ? i + 1 : 0;
        if (camino.includes(valor)) return '[Circular]';
        camino.push(valor);
      }
      return valor;
    });
  } catch (err) {
    return JSON.stringify({ errorAlSerializar: err instanceof Error ? err.message : String(err) });
  }
}

export type Nivel = 'debug' | 'info' | 'warn' | 'error';

/** De dónde sale el contexto que se añade solo. Se inyecta para no atarse a un marco. */
export type LeerContexto = () => Record<string, unknown> | undefined;

export type OpcionesRegistro = {
  leerContexto?: LeerContexto;
  /** Por debajo de este nivel no se emite. Por defecto `debug` solo en desarrollo. */
  nivelMinimo?: Nivel;
  salida?: (nivel: Nivel, linea: string) => void;
};

const ORDEN: Record<Nivel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

export function crearRegistro(opciones: OpcionesRegistro = {}) {
  const minimo = opciones.nivelMinimo
    ?? (process.env.NODE_ENV === 'development' ? 'debug' : 'info');
  const salida = opciones.salida ?? ((nivel, linea) => {
    if (nivel === 'error') console.error(linea);
    else if (nivel === 'warn') console.warn(linea);
    else console.log(linea);
  });

  const emitir = (nivel: Nivel, mensaje: string, datos?: Record<string, unknown>) => {
    if (ORDEN[nivel] < ORDEN[minimo]) return;
    // El contexto va ANTES que los datos de quien llama: así un valor explícito gana,
    // y fuera de una petición el registro sale igual sin campos vacíos.
    const auto = opciones.leerContexto?.() ?? {};
    salida(nivel, serializarSeguro({ hora: new Date().toISOString(), nivel, mensaje, ...auto, ...datos }));
  };

  return {
    debug: (m: string, d?: Record<string, unknown>) => emitir('debug', m, d),
    info:  (m: string, d?: Record<string, unknown>) => emitir('info', m, d),
    warn:  (m: string, d?: Record<string, unknown>) => emitir('warn', m, d),
    error: (m: string, d?: Record<string, unknown>) => emitir('error', m, d),
  };
}

export type Registro = ReturnType<typeof crearRegistro>;
