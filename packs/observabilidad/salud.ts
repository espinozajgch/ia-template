/**
 * Sondas de salud: dos, y no una.
 *
 * ── La distinción que casi nadie hace, y que decide si un despliegue pierde peticiones ──
 *
 * **VIDA** (`/salud/vida`): ¿el proceso está vivo? Si responde que no, el orquestador lo
 * MATA y arranca otro. Por eso **no debe comprobar dependencias**: si la base de datos se
 * cae y la sonda de vida falla, se reinician todas las instancias en bucle — y cuando la
 * base vuelva, no habrá nada arriba que la use.
 *
 * **DISPONIBILIDAD** (`/salud/listo`): ¿puede atender peticiones AHORA? Aquí sí se
 * comprueban las dependencias. Si falla, el balanceador deja de mandarle tráfico pero
 * **no lo mata**: cuando la dependencia vuelva, la instancia se reincorpora sola.
 *
 * Con una sola sonda hay que elegir entre reiniciar por algo que no es culpa del proceso,
 * o mandar tráfico a una instancia que no puede atenderlo. Las dos opciones son malas.
 */

export type Dependencia = {
  nombre: string;
  /** Debe resolver rápido o rechazar. La sonda le pone su propio límite igualmente. */
  comprobar: () => Promise<void>;
  /**
   * `false` si el servicio puede atender sin ella. Una dependencia secundaria caída
   * NO debe sacar la instancia de servicio: degrada, no tumba.
   */
  critica?: boolean;
};

export type Estado = {
  ok: boolean;
  version?: string;
  desdeHace: number;
  dependencias: { nombre: string; ok: boolean; ms: number; critica: boolean; error?: string }[];
};

const arranque = Date.now();

const conLimite = <T>(p: Promise<T>, ms: number) =>
  Promise.race([p, new Promise<never>((_, r) => setTimeout(() => r(new Error(`sin respuesta en ${ms} ms`)), ms))]);

/**
 * Vida: solo dice que el proceso responde. Sin dependencias, a propósito, y barata: la
 * llaman cada pocos segundos.
 */
export const vida = () => ({ ok: true, desdeHace: Math.round((Date.now() - arranque) / 1000) });

/**
 * Disponibilidad: comprueba las dependencias, en paralelo y con límite de tiempo.
 *
 * El límite importa: sin él, una base que no responde deja la sonda colgada, el
 * orquestador la da por fallida por tiempo de espera y se pierde la información de **qué**
 * falló. Con límite, la respuesta dice cuál y en cuánto.
 */
export async function listo(dependencias: Dependencia[], opciones: { ms?: number; version?: string } = {}): Promise<Estado> {
  const ms = opciones.ms ?? 2000;
  const resultados = await Promise.all(dependencias.map(async d => {
    const t = Date.now();
    try {
      await conLimite(d.comprobar(), ms);
      return { nombre: d.nombre, ok: true, ms: Date.now() - t, critica: d.critica !== false };
    } catch (e) {
      return {
        nombre: d.nombre, ok: false, ms: Date.now() - t, critica: d.critica !== false,
        // El mensaje se acota: un error de conexión trae la cadena entera, con credenciales.
        error: (e instanceof Error ? e.message : String(e)).slice(0, 200),
      };
    }
  }));
  return {
    ok: resultados.every(r => r.ok || !r.critica),
    version: opciones.version,
    desdeHace: Math.round((Date.now() - arranque) / 1000),
    dependencias: resultados,
  };
}
