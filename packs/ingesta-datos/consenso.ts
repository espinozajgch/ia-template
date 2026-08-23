/**
 * Varias fuentes afirman el mismo hecho y a veces se contradicen. ¿Cuál se cree?
 *
 * Generalizado de un sistema que ingiere resultados de cuatro webs distintas. Sirve para
 * cualquier ingesta multi-fuente: precios de proveedores, existencias de almacenes,
 * datos de un cliente que llegan por tres integraciones.
 *
 * ── El principio ─────────────────────────────────────────────────────────────
 *
 * **Un conflicto no resuelto se marca, no se esconde.** Elegir en silencio entre dos
 * valores que se contradicen produce un dato que parece firme y no lo es, y nadie vuelve
 * a mirarlo. Marcarlo cuesta una revisión; esconderlo cuesta confiar en todo lo demás.
 */

export type Observacion<T> = {
  /** De dónde viene. Sirve para explicar la decisión después. */
  fuente: string;
  valor: T;
  /** Qué fiable es ESTA lectura, de 0 a 1. Un OCR borroso vale menos que un CSV. */
  confianza?: number;
  /** Qué fiable es la FUENTE en general. Mayor gana ante empate. */
  prioridad?: number;
  /** Una fuente oficial gana a cualquier número de fuentes editoriales. */
  esOficial?: boolean;
  observadoEn?: Date;
};

export type Decision<T> = {
  valor: T | null;
  /** Cuántas fuentes sostienen el valor elegido. */
  apoyos: number;
  total: number;
  /** true si hay desacuerdo real y conviene que lo mire una persona. */
  enConflicto: boolean;
  motivo: 'unica-fuente' | 'oficial' | 'mayoria' | 'desempate-por-prioridad' | 'sin-acuerdo';
  /** Los valores en disputa, para poder explicarlo y revisarlo. */
  discrepancias: { valor: T; fuentes: string[] }[];
};

const clave = (v: unknown) => JSON.stringify(v);

/**
 * Decide entre observaciones de un mismo hecho.
 *
 * El orden de las reglas importa y es el que sale de la experiencia:
 *
 * 1. **Lo oficial manda.** Si la fuente autorizada publicó, se acabó la discusión: tres
 *    periódicos coincidiendo no cambian el resultado que publicó el organismo.
 * 2. **Mayoría con confianza.** Cada valor suma la confianza de quien lo sostiene, no el
 *    número de fuentes: dos lecturas dudosas no valen más que una segura.
 * 3. **Empate → la fuente más fiable**, y se marca conflicto igualmente. Un empate real
 *    significa que el dato no está claro, aunque haya que elegir uno para seguir.
 *
 * `minimoParaAcuerdo` es cuántas fuentes deben coincidir para darlo por firme cuando no
 * hay oficial. Con menos, se decide igual pero queda marcado.
 */
export function decidir<T>(observaciones: Observacion<T>[], minimoParaAcuerdo = 2): Decision<T> {
  const obs = observaciones.filter(o => o.valor !== null && o.valor !== undefined);
  if (!obs.length) {
    return { valor: null, apoyos: 0, total: 0, enConflicto: false, motivo: 'sin-acuerdo', discrepancias: [] };
  }

  const grupos = new Map<string, { valor: T; fuentes: string[]; peso: number; prioridad: number; oficial: boolean }>();
  for (const o of obs) {
    const k = clave(o.valor);
    const g = grupos.get(k) ?? { valor: o.valor, fuentes: [], peso: 0, prioridad: 0, oficial: false };
    g.fuentes.push(o.fuente);
    g.peso += o.confianza ?? 1;
    g.prioridad = Math.max(g.prioridad, o.prioridad ?? 0);
    g.oficial = g.oficial || !!o.esOficial;
    grupos.set(k, g);
  }
  const lista = [...grupos.values()];
  const discrepancias = lista.map(g => ({ valor: g.valor, fuentes: [...g.fuentes] }));

  if (lista.length === 1) {
    const g = lista[0];
    return {
      valor: g.valor, apoyos: g.fuentes.length, total: obs.length,
      // Una sola fuente no está en conflicto, pero tampoco está confirmada.
      enConflicto: false,
      motivo: obs.length === 1 ? 'unica-fuente' : 'mayoria',
      discrepancias,
    };
  }

  const oficiales = lista.filter(g => g.oficial);
  if (oficiales.length === 1) {
    const g = oficiales[0];
    return { valor: g.valor, apoyos: g.fuentes.length, total: obs.length,
             // Que lo oficial contradiga a lo demás no es un conflicto: es la respuesta.
             enConflicto: false, motivo: 'oficial', discrepancias };
  }

  const ordenados = [...lista].sort((a, b) =>
    b.peso - a.peso || b.prioridad - a.prioridad || b.fuentes.length - a.fuentes.length);
  const ganador = ordenados[0], segundo = ordenados[1];

  const empatado = Math.abs(ganador.peso - segundo.peso) < 1e-9;
  const suficiente = ganador.fuentes.length >= minimoParaAcuerdo;

  return {
    valor: ganador.valor,
    apoyos: ganador.fuentes.length,
    total: obs.length,
    enConflicto: empatado || !suficiente,
    motivo: empatado ? 'desempate-por-prioridad' : suficiente ? 'mayoria' : 'sin-acuerdo',
    discrepancias,
  };
}

/**
 * Reconcilia un registro completo campo a campo.
 * Devuelve el registro y **la lista de campos en conflicto**, que es lo que se le enseña a
 * quien revisa: no «este registro tiene un problema», sino cuál y entre qué valores.
 */
export function reconciliar<T extends Record<string, unknown>>(
  porFuente: { fuente: string; datos: Partial<T>; confianza?: number; prioridad?: number; esOficial?: boolean }[],
  campos: (keyof T)[],
  minimoParaAcuerdo = 2,
): { registro: Partial<T>; conflictos: { campo: keyof T; discrepancias: { valor: unknown; fuentes: string[] }[] }[] } {
  const registro: Partial<T> = {};
  const conflictos: { campo: keyof T; discrepancias: { valor: unknown; fuentes: string[] }[] }[] = [];

  for (const campo of campos) {
    const obs = porFuente
      .filter(f => f.datos[campo] !== undefined && f.datos[campo] !== null)
      .map(f => ({ fuente: f.fuente, valor: f.datos[campo], confianza: f.confianza, prioridad: f.prioridad, esOficial: f.esOficial }));
    if (!obs.length) continue;
    const d = decidir(obs, minimoParaAcuerdo);
    if (d.valor !== null) registro[campo] = d.valor as T[keyof T];
    if (d.enConflicto) conflictos.push({ campo, discrepancias: d.discrepancias });
  }
  return { registro, conflictos };
}
