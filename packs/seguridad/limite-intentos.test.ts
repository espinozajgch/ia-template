import { describe, expect, it } from "vitest";
import {
  POLITICA_DE_INTENTOS, SIN_CUPO, clavesDeIntento, crearCupo, cuentaComoFallo, esperaMs, veredicto,
} from "./limite-intentos";

const MIN = 60_000;

describe("la espera", () => {
  it("dobla con cada fallo por encima del máximo, con techo de una hora", () => {
    expect([0, 1, 2, 3, 4, 5, 6].map((n) => esperaMs(n) / MIN)).toEqual([1, 2, 4, 8, 16, 32, 60]);
    expect(esperaMs(-3)).toBe(MIN);
  });

  it("un número enorme de fallos no desborda: se queda en el techo", () => {
    expect(esperaMs(1000)).toBe(60 * MIN);
    expect(esperaMs(Number.MAX_SAFE_INTEGER)).toBe(60 * MIN);
  });
});

describe("el veredicto", () => {
  const ahora = 10 * 60 * MIN;
  const p = POLITICA_DE_INTENTOS;

  it("sin historial, se permite", () => {
    expect(veredicto(null, 5, ahora)).toEqual({ permitido: true });
  });

  it("un bloqueo vigente manda, aunque la ventana haya pasado", () => {
    expect(veredicto({ intentos: 1, desde: 0, bloqueadoHasta: ahora + 90_000 }, 5, ahora))
      .toEqual({ permitido: false, segundos: 90 });
  });

  it("bajo el máximo se permite; en el máximo, espera la primera ración", () => {
    expect(veredicto({ intentos: 4, desde: ahora - MIN, bloqueadoHasta: null }, 5, ahora)).toEqual({ permitido: true });
    expect(veredicto({ intentos: 5, desde: ahora - MIN, bloqueadoHasta: null }, 5, ahora)).toEqual({ permitido: false, segundos: 60 });
    expect(veredicto({ intentos: 7, desde: ahora - MIN, bloqueadoHasta: null }, 5, ahora)).toEqual({ permitido: false, segundos: 240 });
  });

  it("pasada la ventana sin bloqueo vigente, el historial no cuenta", () => {
    expect(veredicto({ intentos: 9, desde: ahora - p.ventanaMs - 1, bloqueadoHasta: ahora - 1 }, 5, ahora))
      .toEqual({ permitido: true });
    expect(veredicto({ intentos: 9, desde: ahora - p.ventanaMs, bloqueadoHasta: null }, 5, ahora).permitido).toBe(false);
  });
});

describe("las claves", () => {
  it("son huellas: la tabla no guarda el correo", () => {
    const [cuenta] = clavesDeIntento({ ambito: "personal", identificador: "Ana@Ejemplo.test" });
    expect(cuenta.clave).toMatch(/^[0-9a-f]{64}$/);
    expect(cuenta.clave.includes("ana")).toBe(false);
    expect(cuenta.maximo).toBe(5);
  });

  it("no distinguen mayúsculas ni espacios, y el ámbito separa contadores", () => {
    const a = clavesDeIntento({ ambito: "personal", identificador: " ana@ejemplo.test " })[0].clave;
    expect(a).toBe(clavesDeIntento({ ambito: "personal", identificador: "ANA@ejemplo.test" })[0].clave);
    expect(a).not.toBe(clavesDeIntento({ ambito: "clientes", identificador: "ana@ejemplo.test" })[0].clave);
  });

  it("la IP sólo cuenta si es atribuible", () => {
    expect(clavesDeIntento({ ambito: "a", identificador: "x" })).toHaveLength(1);
    expect(clavesDeIntento({ ambito: "a", identificador: "x", ipAtribuible: null })).toHaveLength(1);
    const dos = clavesDeIntento({ ambito: "a", identificador: "x", ipAtribuible: "203.0.113.7" });
    expect(dos).toHaveLength(2);
    expect(dos[1].maximo).toBe(20);
  });
});

describe("qué cuenta como fallo", () => {
  it("sólo la credencial incorrecta", () => {
    expect(cuentaComoFallo(401)).toBe(true);
    for (const s of [200, 204, 400, 403, 429, 500, 503]) expect(cuentaComoFallo(s), String(s)).toBe(false);
  });
});

describe("el cupo de derivaciones", () => {
  const pausa = (ms: number) => new Promise((r) => setTimeout(r, ms));

  it("nunca corre más de lo permitido a la vez, y todos acaban", async () => {
    const cupo = crearCupo(2, 1000);
    let maximo = 0;
    const trabajo = async () => { maximo = Math.max(maximo, cupo.estado().enCurso); await pausa(5); return 1; };
    const resultados = await Promise.all(Array.from({ length: 7 }, () => cupo.con(trabajo)));
    expect(resultados).toEqual(Array(7).fill(1));
    expect(maximo).toBe(2);
    expect(cupo.estado()).toEqual({ enCurso: 0, esperando: 0 });
  });

  it("si la espera se agota, rechaza ESA petición y no deja nada colgado", async () => {
    const cupo = crearCupo(1, 20);
    const larga = cupo.con(() => pausa(80).then(() => "hecho"));
    expect(await cupo.con(async () => "no debería")).toBe(SIN_CUPO);
    expect(cupo.estado().esperando).toBe(0);
    expect(await larga).toBe("hecho");
    expect(cupo.estado()).toEqual({ enCurso: 0, esperando: 0 });
  });

  it("un trabajo que falla devuelve el turno", async () => {
    const cupo = crearCupo(1, 100);
    await expect(cupo.con(async () => { throw new Error("x"); })).rejects.toThrow("x");
    expect(await cupo.con(async () => "sigue")).toBe("sigue");
  });
});
