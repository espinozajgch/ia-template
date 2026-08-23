/**
 * Lo que cuesta usar un modelo, mientras ocurre.
 *
 * Portado de una implementación real que narra partidos en directo y no puede permitirse
 * ni pasarse de presupuesto ni cortarse a la mitad.
 *
 * ── Por qué un total no basta ────────────────────────────────────────────────
 *
 * Saber que una ejecución costó 0,045 dólares **no dice dónde recortar**. Saber que la
 * mitad se va en una acción concreta, sí. Por eso se anota por acción desde el principio:
 * añadirlo después obliga a instrumentar de nuevo.
 */

export type Tarifa = { entradaPorMillon: number; salidaPorMillon: number };

/** Modelos que no cuestan porque **no hay llamada**, no porque su tarifa sea cero. */
export type ModeloSinCoste = (modelo: string) => boolean;

export type OpcionesCuenta = {
  tarifas: Record<string, Tarifa>;
  tarifaPorDefecto?: Tarifa;
  /** Techo de la ejecución. Ver `excedido` — aquí no se corta nada. */
  presupuesto?: number;
  sinCoste?: ModeloSinCoste;
};

export type Anotacion = {
  accion?: string;
  modelo?: string;
  tokensEntrada?: number;
  tokensSalida?: number;
  error?: string;
};

export function costeDe(a: Anotacion, o: OpcionesCuenta): number {
  const modelo = (a.modelo ?? '').trim().toLowerCase();
  // Cero exacto, y no por tarifa cero: es que no hubo llamada. Devolver cero aquí impide
  // que una medición hecha con el doble se presente como medición de coste real.
  if (o.sinCoste?.(modelo)) return 0;
  const t = o.tarifas[modelo] ?? o.tarifaPorDefecto;
  if (!t) return 0;
  return ((a.tokensEntrada ?? 0) / 1e6) * t.entradaPorMillon
       + ((a.tokensSalida ?? 0) / 1e6) * t.salidaPorMillon;
}

export class Cuenta {
  llamadas = 0;
  fallidas = 0;
  tokensEntrada = 0;
  tokensSalida = 0;
  coste = 0;
  /** Lo que convierte el total en algo accionable. */
  porAccion: Record<string, number> = {};
  modelos: Record<string, number> = {};

  constructor(private readonly o: OpcionesCuenta, readonly idEjecucion = '') {}

  anotar(a: Anotacion): number {
    this.llamadas++;
    if (a.error) this.fallidas++;
    this.tokensEntrada += a.tokensEntrada ?? 0;
    this.tokensSalida += a.tokensSalida ?? 0;

    const importe = costeDe(a, this.o);
    this.coste += importe;

    const clave = a.accion ?? '(sin acción)';
    this.porAccion[clave] = (this.porAccion[clave] ?? 0) + importe;
    const m = a.modelo ?? '(desconocido)';
    this.modelos[m] = (this.modelos[m] ?? 0) + 1;
    return importe;
  }

  get excedido(): boolean {
    return this.o.presupuesto !== undefined && this.coste > this.o.presupuesto;
  }

  /**
   * Si TODO lo contado salió de un doble.
   *
   * Es una guarda de integridad, no una comodidad: una cuenta así **no mide coste real**
   * y no puede presentarse como si lo hiciera. Sin esta comprobación, una ejecución de
   * ensayo produce un informe de coste que parece una medición y vale cero.
   */
  get esEnsayo(): boolean {
    const usados = Object.keys(this.modelos);
    return usados.length > 0 && usados.every(m => this.o.sinCoste?.(m.toLowerCase()) ?? false);
  }

  /** Dónde se va el dinero, de más a menos. */
  masCaras(cuantas = 3): { accion: string; coste: number }[] {
    return Object.entries(this.porAccion)
      .map(([accion, coste]) => ({ accion, coste }))
      .sort((a, b) => b.coste - a.coste)
      .slice(0, cuantas);
  }

  resumen(): string {
    let s = `${this.llamadas} llamada(s) · ${this.tokensEntrada}+${this.tokensSalida} tokens · ${this.coste.toFixed(5)} USD`;
    if (this.fallidas) s += ` · ${this.fallidas} fallida(s)`;
    if (this.esEnsayo) s += '  (ENSAYO: no es coste real)';
    if (this.excedido) s += `  ⚠ por encima del presupuesto (${this.o.presupuesto})`;
    return s;
  }
}

// ── Qué hacer al pasarse del presupuesto ─────────────────────────────────────
/**
 * Hay tres salidas, y **la elección es del negocio, no del código**:
 *
 * | | respeta el techo | termina el trabajo |
 * |---|---|---|
 * | avisar y seguir | ✗ | ✓ |
 * | cortar | ✓ | ✗ |
 * | **bajar a un modelo más barato** | ✓ | ✓ |
 *
 * La tercera es la única que cumple las dos, y por eso suele ser la respuesta — pero
 * cuesta calidad, y eso también hay que decirlo.
 *
 * Lo que NO vale es no haberlo decidido: entonces la respuesta de hecho es «avisar y
 * seguir», y el techo era un adorno.
 */
export type AlExcederse = 'avisar' | 'cortar' | 'degradar';

export type Degradacion = { modelo: string; motivo: string };

export function decidirAlExcederse(
  cuenta: Cuenta,
  politica: AlExcederse,
  modeloDeRespaldo?: string,
): { seguir: boolean; degradarA?: Degradacion; aviso?: string } {
  if (!cuenta.excedido) return { seguir: true };

  const aviso = `presupuesto superado: ${cuenta.coste.toFixed(5)} USD · ${cuenta.masCaras(1)[0]?.accion ?? '?'} es lo más caro`;

  if (politica === 'cortar') return { seguir: false, aviso };
  if (politica === 'degradar' && modeloDeRespaldo) {
    return { seguir: true, degradarA: { modelo: modeloDeRespaldo, motivo: aviso }, aviso };
  }
  // Sin modelo de respaldo, «degradar» no puede cumplirse: se avisa, y se dice por qué,
  // en vez de fingir que se degradó.
  return { seguir: true, aviso: politica === 'degradar' ? `${aviso} — sin modelo de respaldo configurado` : aviso };
}
