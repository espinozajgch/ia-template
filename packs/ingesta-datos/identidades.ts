/**
 * Decidir si dos nombres publicados por fuentes distintas son la misma cosa.
 *
 * Generalizado de una implementación real que coteja jinetes y ejemplares entre cuatro
 * webs. Sirve igual para clientes, proveedores, pacientes o productos: cualquier entidad
 * que llegue por más de un sitio y se escriba a mano en alguno de ellos.
 *
 * ── La postura, que es lo que hay que entender antes de tocar los umbrales ────
 *
 * Estas reglas son deliberadamente CONSERVADORAS. Fusionar dos entidades distintas
 * corrompe el histórico **en silencio** y es casi imposible de deshacer; dejar un
 * duplicado solo lo fragmenta, se ve enseguida y se arregla después.
 *
 * Ante la duda, no se fusiona.
 *
 * Todo lo de aquí es puro: se prueba sin base de datos y se usa igual al ingerir que al
 * revisar lo ya guardado.
 */

/**
 * Letras griegas y cirílicas que se ven EXACTAMENTE igual que las latinas.
 *
 * Hay nombres publicados con ellas mezcladas —una alfa griega dentro de una palabra por
 * lo demás latina— indistinguibles a la vista pero distintas para la máquina. Sin
 * plegarlas, la misma persona queda en dos fichas y nadie entiende por qué.
 *
 * Pasa más de lo que parece: copiar y pegar desde un PDF, un teclado con otra
 * distribución, o una web que mezcla alfabetos en su plantilla.
 */
const CONFUNDIBLES: Record<string, string> = {
  // griegas mayúsculas
  Α: 'A', Β: 'B', Ε: 'E', Ζ: 'Z', Η: 'H', Ι: 'I', Κ: 'K', Μ: 'M',
  Ν: 'N', Ο: 'O', Ρ: 'P', Τ: 'T', Υ: 'Y', Χ: 'X',
  // cirílicas mayúsculas
  А: 'A', В: 'B', Е: 'E', К: 'K', М: 'M', Н: 'H', О: 'O', Р: 'P',
  С: 'C', Т: 'T', У: 'Y', Х: 'X',
  // minúsculas que también se cuelan
  а: 'a', е: 'e', о: 'o', р: 'p', с: 'c', х: 'x', у: 'y',
};

export const plegarConfundibles = (v: string) =>
  [...v].map(c => CONFUNDIBLES[c] ?? c).join('');

/** Mayúsculas, sin tildes, sin puntuación, con los espacios colapsados. */
export const normalizar = (v: string): string =>
  plegarConfundibles(
    (v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase(),
  )
    .replace(/[.,''`´]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// ── Nombres con calificador entre paréntesis ─────────────────────────────────
// «ACME (ES)», «Juan Pérez (padre)», «TIBU (PAN)»: la parte entre paréntesis afirma algo.
const CALIFICADOR = /\s*\(([^)]{1,12})\)\s*$/;

export const nombreBase  = (n: string) => normalizar(n).replace(CALIFICADOR, '').trim();
export const calificador = (n: string) => normalizar(n).match(CALIFICADOR)?.[1] ?? null;

/**
 * Coinciden si comparten nombre base y **no se contradicen** en el calificador.
 * «ACME» y «ACME (ES)» sí. «ACME (ES)» y «ACME (MX)» no: ahí las fuentes están
 * afirmando cosas distintas, y creerles a las dos es inventar.
 */
export function nombresConCalificadorCoinciden(a: string, b: string): boolean {
  const base = nombreBase(a);
  if (!base || base !== nombreBase(b)) return false;
  const ca = calificador(a), cb = calificador(b);
  return !ca || !cb || ca === cb;
}

// ── Nombres de persona ────────────────────────────────────────────────────────
export type NombreDesglosado = {
  /** Palabras completas. */ palabras: string[];
  /** Iniciales sueltas.  */ iniciales: string[];
};

export const desglosarNombre = (n: string): NombreDesglosado => {
  const t = normalizar(n).split(' ').filter(Boolean);
  return { palabras: t.filter(x => x.length > 1), iniciales: t.filter(x => x.length === 1) };
};

const quitarUno = <T,>(xs: T[], v: T): T[] | null => {
  const i = xs.indexOf(v);
  return i < 0 ? null : [...xs.slice(0, i), ...xs.slice(i + 1)];
};

/**
 * «PÉREZ J» y «PÉREZ JUAN» son la misma persona: la inicial es compatible con la palabra.
 * «PÉREZ J» y «PÉREZ LUIS» no lo son: la inicial CONTRADICE la palabra.
 *
 * Esa asimetría es la clave — una fuente que abrevia no está diciendo algo distinto, pero
 * una que da otra inicial sí.
 */
export function nombresDePersonaCoinciden(a: string, b: string): boolean {
  const x = desglosarNombre(a), y = desglosarNombre(b);
  if (!x.palabras.length || !y.palabras.length) return false;

  // El que tiene más palabras completas manda; el otro aporta iniciales.
  const [rico, pobre] = x.palabras.length >= y.palabras.length ? [x, y] : [y, x];

  let restantes: string[] = [...rico.palabras];
  for (const p of pobre.palabras) {
    const sig = quitarUno(restantes, p);
    if (!sig) return false;          // una palabra completa que el otro no tiene
    restantes = sig;
  }
  for (const ini of pobre.iniciales) {
    const i = restantes.findIndex(p => p.startsWith(ini));
    if (i < 0) return false;         // una inicial que ninguna palabra restante empieza
    restantes.splice(i, 1);
  }
  return true;
}

// ── Distancia de edición, acotada ────────────────────────────────────────────
/**
 * Levenshtein con corte: en cuanto supera el límite deja de calcular y devuelve
 * `limite + 1`. Sin el corte, comparar cada nombre nuevo con todos los guardados es
 * cuadrático sobre cadenas largas y la ingesta se arrastra.
 */
export function distanciaEdicion(a: string, b: string, limite: number): number {
  if (Math.abs(a.length - b.length) > limite) return limite + 1;
  let previa = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const fila = [i];
    let minimo = i;
    for (let j = 1; j <= b.length; j++) {
      const coste = a[i - 1] === b[j - 1] ? 0 : 1;
      fila[j] = Math.min(previa[j] + 1, fila[j - 1] + 1, previa[j - 1] + coste);
      if (fila[j] < minimo) minimo = fila[j];
    }
    if (minimo > limite) return limite + 1;   // toda la fila supera el límite: imposible bajar
    previa = fila;
  }
  return previa[b.length];
}

/**
 * Longitud a partir de la cual se tolera alguna diferencia.
 *
 * Por debajo, NINGUNA: en «TIBU» y «TABU» una letra distinta es probablemente otro
 * nombre, no una errata. Por encima, una errata en veinte caracteres es normal y no
 * tolerarla fragmenta lo que sí era lo mismo.
 */
const LONGITUD_MINIMA_PARA_TOLERAR = 8;

/**
 * Se parecen lo bastante como para **sospechar**, no para fusionar.
 * El resultado de esto va a revisión humana; nunca a un `UPDATE`.
 */
export function seParecen(a: string, b: string): boolean {
  const x = normalizar(a), y = normalizar(b);
  if (!x || !y) return false;
  if (x === y) return true;

  const largo = Math.max(x.length, y.length);
  if (largo < LONGITUD_MINIMA_PARA_TOLERAR) return false;

  const limite = Math.max(1, Math.floor(largo / 10));
  return distanciaEdicion(x, y, limite) <= limite;
}

// ── Plan de fusión ────────────────────────────────────────────────────────────
export type Candidato = { id: number | string; nombre: string; registros: number };
export type Fusion = {
  conservar: Candidato;
  absorber: Candidato[];
  motivo: 'nombre-identico' | 'iniciales-compatibles' | 'calificador-compatible';
};

/**
 * Agrupa candidatos que son la misma entidad y decide **cuál sobrevive**: el que más
 * registros tiene, porque mover pocos registros a muchos rompe menos referencias que al
 * revés. Con empate, el nombre más largo: suele ser el más completo, no el abreviado.
 *
 * Devuelve un PLAN. Aplicarlo es otra cosa, y conviene que pase por una persona: ver el
 * apartado de revisión del `PACK.md`.
 */
export function planificarFusiones(candidatos: Candidato[]): Fusion[] {
  const pendientes = [...candidatos];
  const fusiones: Fusion[] = [];

  while (pendientes.length) {
    const cabeza = pendientes.shift()!;
    const grupo: Candidato[] = [];
    let motivo: Fusion['motivo'] = 'nombre-identico';

    for (let i = pendientes.length - 1; i >= 0; i--) {
      const otro = pendientes[i];
      let coincide = false;
      if (normalizar(cabeza.nombre) === normalizar(otro.nombre)) { coincide = true; motivo = 'nombre-identico'; }
      else if (nombresConCalificadorCoinciden(cabeza.nombre, otro.nombre)) { coincide = true; motivo = 'calificador-compatible'; }
      else if (nombresDePersonaCoinciden(cabeza.nombre, otro.nombre)) { coincide = true; motivo = 'iniciales-compatibles'; }
      if (coincide) { grupo.push(otro); pendientes.splice(i, 1); }
    }
    if (!grupo.length) continue;

    const todos = [cabeza, ...grupo].sort((a, b) =>
      b.registros - a.registros || b.nombre.length - a.nombre.length);
    fusiones.push({ conservar: todos[0], absorber: todos.slice(1), motivo });
  }
  return fusiones;
}
