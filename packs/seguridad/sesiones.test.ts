import { describe, expect, it } from "vitest";
import {
  POLITICA_POR_DEFECTO, cookieBorrada, cookieDeSesion, huellaDeTestigo, mismaHuella, mismoOrigen,
  nombreDeCookie, nuevoTestigo, tieneFormaDeTestigo, vigencia,
} from "./sesiones";

const H = 3600_000;

describe("el testigo", () => {
  it("es de 256 bits, distinto cada vez, y con forma reconocible", () => {
    const a = nuevoTestigo(), b = nuevoTestigo();
    expect(a).toHaveLength(43);
    expect(a).not.toBe(b);
    expect(tieneFormaDeTestigo(a)).toBe(true);
  });

  it("se guarda su huella, que no lo contiene ni permite reconstruirlo", () => {
    const t = nuevoTestigo();
    const h = huellaDeTestigo(t);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(h).toBe(huellaDeTestigo(t));
    expect(h.includes(t)).toBe(false);
    expect(mismaHuella(h, huellaDeTestigo(t))).toBe(true);
    expect(mismaHuella(h, huellaDeTestigo(nuevoTestigo()))).toBe(false);
    expect(mismaHuella(h, "")).toBe(false);
  });

  it("lo que no tiene forma de testigo no llega a la base", () => {
    for (const v of [undefined, null, 7, "", "corto", "a".repeat(44), "a".repeat(42) + "=",
      "' OR 1=1 --".padEnd(43, "x"), "123e4567-e89b-12d3-a456-426614174000"]) {
      expect(tieneFormaDeTestigo(v), String(v)).toBe(false);
    }
  });
});

describe("la cookie", () => {
  it("con HTTPS lleva __Host-, Secure, HttpOnly, Path=/ y SameSite", () => {
    const nombre = nombreDeCookie("app_sesion", true);
    expect(nombre).toBe("__Host-app_sesion");
    const c = cookieDeSesion(nombre, "T", 3600.7, { segura: true });
    expect(c).toBe("__Host-app_sesion=T; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=3600");
    expect(c).not.toMatch(/Domain=/);
  });

  it("sin HTTPS, sin prefijo ni Secure: el navegador descartaría la cookie", () => {
    expect(nombreDeCookie("app_sesion", false)).toBe("app_sesion");
    expect(cookieDeSesion("app_sesion", "T", 60, { segura: false, sameSite: "Strict" }))
      .toBe("app_sesion=T; Path=/; HttpOnly; SameSite=Strict; Max-Age=60");
  });

  it("se borra con los mismos atributos con los que se emitió", () => {
    const opciones = { segura: true, sameSite: "Strict" as const };
    const emitida = cookieDeSesion("__Host-s", "T", 60, opciones);
    const borrada = cookieBorrada("__Host-s", opciones);
    expect(borrada).toBe("__Host-s=; Path=/; HttpOnly; SameSite=Strict; Secure; Max-Age=0");
    expect(emitida.split("; ").slice(1, -1)).toEqual(borrada.split("; ").slice(1, -1));
    expect(cookieDeSesion("s", "T", -5, opciones)).toMatch(/Max-Age=0$/);
  });
});

describe("la caducidad", () => {
  const politica = { inactividadMs: 2 * H, maximoMs: 10 * H };

  it("se renueva con la actividad, pero nunca más allá del máximo", () => {
    expect(vigencia({ creadaEn: 0, ultimaActividad: 0 }, 1 * H, politica)).toEqual({ vigente: true, expiraEn: 3 * H });
    expect(vigencia({ creadaEn: 0, ultimaActividad: 9 * H }, 9.5 * H, politica)).toEqual({ vigente: true, expiraEn: 10 * H });
  });

  it("caduca por inactividad", () => {
    expect(vigencia({ creadaEn: 0, ultimaActividad: 1 * H }, 3 * H, politica)).toEqual({ vigente: false, motivo: "inactividad" });
    expect(vigencia({ creadaEn: 0, ultimaActividad: 1 * H }, 3 * H - 1, politica).vigente).toBe(true);
  });

  it("caduca por el máximo aunque haya actividad: una pestaña abierta no vive para siempre", () => {
    expect(vigencia({ creadaEn: 0, ultimaActividad: 10 * H - 1 }, 10 * H, politica)).toEqual({ vigente: false, motivo: "maximo" });
    expect(vigencia({ creadaEn: 0, ultimaActividad: 10 * H - 1 }, 10 * H - 1, politica).vigente).toBe(true);
  });

  it("la política por defecto: 12 horas de inactividad y 7 días en total", () => {
    expect(POLITICA_POR_DEFECTO).toEqual({ inactividadMs: 12 * H, maximoMs: 7 * 24 * H });
    expect(vigencia({ creadaEn: 0, ultimaActividad: 0 }, 0)).toEqual({ vigente: true, expiraEn: 12 * H });
  });
});

describe("el origen", () => {
  const cabeceras = (h: Record<string, string>) => (n: string) => h[n] ?? null;

  it("el navegador dice de dónde viene: se le cree", () => {
    expect(mismoOrigen(cabeceras({ "sec-fetch-site": "same-origin" }))).toBe(true);
    expect(mismoOrigen(cabeceras({ "sec-fetch-site": "none" }))).toBe(true);
    expect(mismoOrigen(cabeceras({ "sec-fetch-site": "cross-site", origin: "https://app.test", host: "app.test" }))).toBe(false);
    expect(mismoOrigen(cabeceras({ "sec-fetch-site": "same-site" }))).toBe(false);
  });

  it("si no, Origin tiene que ser el Host", () => {
    expect(mismoOrigen(cabeceras({ origin: "https://app.test", host: "app.test" }))).toBe(true);
    expect(mismoOrigen(cabeceras({ origin: "https://otro.test", host: "app.test" }))).toBe(false);
    expect(mismoOrigen(cabeceras({ origin: "https://app.test" }))).toBe(false);
    expect(mismoOrigen(cabeceras({ origin: "no es una url", host: "app.test" }))).toBe(false);
  });

  it("sin ninguna de las dos no viajan cookies de nadie: no se bloquea", () => {
    expect(mismoOrigen(cabeceras({}))).toBe(true);
  });
});
