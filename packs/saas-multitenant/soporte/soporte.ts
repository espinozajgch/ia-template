/**
 * Soporte: el canal entre el cliente y la plataforma.
 *
 * En un producto multi-cliente esto no es un accesorio: es **el único sitio por donde un
 * fallo llega desde quien lo sufre hasta quien puede arreglarlo**. Si no existe, el camino
 * real es un correo a alguien que quizá esté de vacaciones, y el fallo tarda semanas.
 *
 * Portado de dos implementaciones reales. Todo lo de aquí es puro: se prueba sin base.
 */

export const CATEGORIAS = ['consulta', 'incidencia', 'facturacion', 'sugerencia', 'otro'] as const;
export const PRIORIDADES = ['baja', 'normal', 'alta', 'urgente'] as const;

/**
 * Los estados, y el que casi siempre falta: **esperando al cliente**.
 *
 * Sin él, un ticket que espera respuesta del cliente sigue contando como abierto y la cola
 * miente: parece que el equipo va retrasado cuando la pelota está en el otro campo. Y peor
 * — nadie sabe a cuáles hay que insistir.
 */
export const ESTADOS = ['abierto', 'en_progreso', 'esperando_cliente', 'resuelto', 'cerrado'] as const;

export type Categoria = typeof CATEGORIAS[number];
export type Prioridad = typeof PRIORIDADES[number];
export type Estado    = typeof ESTADOS[number];
/** Los dos lados de la conversación. */
export type Lado = 'cliente' | 'soporte';

/**
 * El peso de negocio NO coincide con el orden alfabético.
 *
 * Ordenar la columna de texto en la base devuelve «alta» por debajo de «baja», así que la
 * cola sale al revés justo en lo que más importa. Es un fallo real y silencioso: la lista
 * se ve ordenada.
 */
export const PESO: Record<Prioridad, number> = { urgente: 4, alta: 3, normal: 2, baja: 1 };

export function ordenarPorPrioridad<T extends { prioridad: Prioridad; ultimoMensajeEn: Date }>(tickets: T[]): T[] {
  return [...tickets].sort((a, b) =>
    (PESO[b.prioridad] ?? 0) - (PESO[a.prioridad] ?? 0) ||
    b.ultimoMensajeEn.getTime() - a.ultimoMensajeEn.getTime());
}

/**
 * No leído, **por lado**.
 *
 * Cada lado tiene su propia marca de visto. Con una sola, abrir el ticket desde soporte
 * marca como leído lo que el cliente no ha visto — y el cliente deja de recibir el aviso
 * de que le han contestado.
 */
export function tieneSinLeer(
  ultimoMensajeDe: Lado, vistoEn: Date | null, ultimoMensajeEn: Date, lado: Lado,
): boolean {
  // Lo que escribió uno mismo nunca está sin leer.
  if (ultimoMensajeDe === lado) return false;
  return !vistoEn || vistoEn < ultimoMensajeEn;
}

// ── Transiciones ──────────────────────────────────────────────────────────────
/**
 * Qué puede pasar a qué, y quién puede hacerlo.
 *
 * Está escrito en vez de repartido por los manejadores porque las reglas que importan son
 * negativas —lo que NO se puede— y esas se olvidan en un manejador nuevo.
 */
const TRANSICIONES: Record<Estado, { a: Estado[]; quien: Lado[] }> = {
  abierto:           { a: ['en_progreso', 'esperando_cliente', 'resuelto', 'cerrado'], quien: ['soporte'] },
  en_progreso:       { a: ['esperando_cliente', 'resuelto', 'cerrado'],                quien: ['soporte'] },
  // El cliente puede reabrir el suyo respondiendo: es lo que evita que un «resuelto»
  // prematuro obligue a abrir un ticket nuevo y se pierda el hilo.
  esperando_cliente: { a: ['en_progreso', 'resuelto', 'cerrado'],                      quien: ['soporte', 'cliente'] },
  resuelto:          { a: ['en_progreso', 'cerrado'],                                  quien: ['soporte', 'cliente'] },
  // Cerrado es terminal. Reabrir uno cerrado hace que el histórico deje de significar
  // nada: un ticket de hace un año vuelve a la cola de hoy.
  cerrado:           { a: [],                                                          quien: [] },
};

export function puedeTransicionar(desde: Estado, hasta: Estado, lado: Lado): boolean {
  const t = TRANSICIONES[desde];
  return !!t && t.a.includes(hasta) && t.quien.includes(lado);
}

export function motivoDeRechazo(desde: Estado, hasta: Estado, lado: Lado): string | null {
  if (puedeTransicionar(desde, hasta, lado)) return null;
  if (desde === 'cerrado') return 'Un ticket cerrado no se reabre: abre uno nuevo y enlaza este.';
  if (!TRANSICIONES[desde]?.a.includes(hasta)) return `No se puede pasar de "${desde}" a "${hasta}".`;
  return `El lado "${lado}" no puede llevar un ticket de "${desde}" a "${hasta}".`;
}

/** Un ticket cerrado tampoco admite mensajes: si no, la conversación sigue sin cola. */
export const admiteMensajes = (estado: Estado): boolean => estado !== 'cerrado';

/**
 * Estado tras un mensaje nuevo, si nadie lo cambia a mano.
 *
 * Automatizarlo importa: si dependiera de que alguien lo mueva, la cola se llenaría de
 * tickets «esperando cliente» que el cliente ya contestó hace tres días.
 */
export function estadoTrasMensaje(actual: Estado, de: Lado): Estado {
  if (actual === 'cerrado') return actual;
  if (de === 'cliente') return actual === 'esperando_cliente' || actual === 'resuelto' ? 'en_progreso' : actual;
  return actual === 'abierto' ? 'en_progreso' : actual;
}

// ── Resumen de la cola ────────────────────────────────────────────────────────
export type Ticket = {
  id: string | number;
  clienteId: string | number;
  estado: Estado;
  prioridad: Prioridad;
  ultimoMensajeDe: Lado;
  ultimoMensajeEn: Date;
  vistoPorSoporteEn?: Date | null;
  vistoPorClienteEn?: Date | null;
  creadoEn: Date;
};

export type Resumen = {
  total: number;
  porEstado: Record<Estado, number>;
  /** Abiertos que esperan a SOPORTE. Es el número que mide al equipo. */
  enNuestroTejado: number;
  sinLeerPorSoporte: number;
  /** El más viejo sin contestar, en horas. Lo que de verdad duele a un cliente. */
  esperaMasLargaHoras: number | null;
};

export function resumir(tickets: Ticket[], ahora = new Date()): Resumen {
  const porEstado = Object.fromEntries(ESTADOS.map(e => [e, 0])) as Record<Estado, number>;
  for (const t of tickets) porEstado[t.estado]++;

  // «Esperando cliente» NO cuenta como nuestro: separarlo es lo que hace que el número
  // signifique algo. Sin la separación, el equipo parece retrasado por tickets que
  // dependen de una respuesta que no controla.
  const nuestros = tickets.filter(t =>
    (t.estado === 'abierto' || t.estado === 'en_progreso') && t.ultimoMensajeDe === 'cliente');

  const esperas = nuestros.map(t => (ahora.getTime() - t.ultimoMensajeEn.getTime()) / 3_600_000);

  return {
    total: tickets.length,
    porEstado,
    enNuestroTejado: nuestros.length,
    sinLeerPorSoporte: tickets.filter(t =>
      tieneSinLeer(t.ultimoMensajeDe, t.vistoPorSoporteEn ?? null, t.ultimoMensajeEn, 'soporte')).length,
    esperaMasLargaHoras: esperas.length ? Math.round(Math.max(...esperas) * 10) / 10 : null,
  };
}
