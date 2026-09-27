/**
 * La prueba que importa es la de interoperabilidad: el hash fijo de abajo lo escribió
 * `argon2-cffi` (Python). Si este módulo lo verifica, un proyecto Python y uno Node pueden
 * compartir tabla de usuarios, y `contrasenas.py` hace la misma prueba en sentido inverso.
 */
import { describe, it, expect } from "vitest";
import {
  hashContrasena, verificarContrasena, verificarEnVacio, pordebajo,
  PARAMETROS, LONGITUD_MAXIMA, type Legado,
} from "./contrasenas";

const CLAVE = "correcto caballo pila grapa";
/** `argon2.PasswordHasher().hash("correcto caballo pila grapa")`, argon2-cffi 25.1.0. */
const DE_PYTHON =
  "$argon2id$v=19$m=65536,t=3,p=4$Bq6ZCBJiz1tLC5hbkD3DJQ$Hf9Md/ypAvFWchlYeqrwskz4Iq0i26bTQyowsL1TGE4";

describe("hash nuevo", () => {
  it("es argon2id en formato PHC con los parámetros del estándar", async () => {
    const h = await hashContrasena(CLAVE);
    expect(h).toMatch(/^\$argon2id\$v=19\$m=65536,t=3,p=4\$[A-Za-z0-9+/]+\$[A-Za-z0-9+/]+$/);
    expect(await verificarContrasena(CLAVE, h)).toEqual({ valida: true, necesitaRehash: false });
    expect((await verificarContrasena("otra", h)).valida).toBe(false);
  });

  it("lleva sal propia: la misma contraseña nunca da el mismo hash", async () => {
    expect(await hashContrasena(CLAVE)).not.toBe(await hashContrasena(CLAVE));
  });

  it("rechaza lo que pasa de la longitud máxima, al guardar y al comprobar", async () => {
    const larga = "x".repeat(LONGITUD_MAXIMA + 1);
    await expect(hashContrasena(larga)).rejects.toThrow(/demasiado larga/);
    // El hash de la propia contraseña larga, hecho por fuera: aun así no autentica.
    const { hash } = await import("@node-rs/argon2");
    expect(await verificarContrasena(larga, await hash(larga, PARAMETROS))).toEqual({ valida: false, necesitaRehash: false });
  });

  it("el máximo exacto sí vale, al guardar y al comprobar", async () => {
    const justa = "x".repeat(LONGITUD_MAXIMA);
    expect(await verificarContrasena(justa, await hashContrasena(justa))).toEqual({ valida: true, necesitaRehash: false });
  });
});

describe("interoperabilidad", () => {
  it("verifica el hash que escribió Python", async () => {
    expect(await verificarContrasena(CLAVE, DE_PYTHON)).toEqual({ valida: true, necesitaRehash: false });
  });
});

describe("re-hash", () => {
  it("marca un argon2 más débil, y nunca rebaja uno más fuerte", () => {
    // Cada condición por separado: si sólo se probaran juntas, quitar una no se notaría.
    expect(pordebajo("$argon2id$v=19$m=19456,t=3,p=4$c2Fs$aGFzaA")).toBe(true);  // memoria
    expect(pordebajo("$argon2id$v=19$m=65536,t=2,p=4$c2Fs$aGFzaA")).toBe(true);  // pasadas
    expect(pordebajo("$argon2id$v=16$m=65536,t=3,p=4$c2Fs$aGFzaA")).toBe(true);  // versión
    expect(pordebajo("$argon2i$v=19$m=65536,t=3,p=4$c2Fs$aGFzaA")).toBe(true);   // variante
    expect(pordebajo("$argon2id$v=19$m=65536,t=3,p=4$c2Fs$aGFzaA")).toBe(false);
    expect(pordebajo("$argon2id$v=19$m=131072,t=10,p=16$c2Fs$aGFzaA")).toBe(false); // más fuerte, con dos cifras
  });

  it("lo que no se deja leer se trata como débil", () => {
    expect(pordebajo("$argon2id$sin-parametros")).toBe(true);
    expect(pordebajo("x$argon2id$v=19$m=65536,t=3,p=4$c2Fs$aGFzaA")).toBe(true);
  });

  it("un argon2 débil autentica y pide re-hash", async () => {
    const { hash } = await import("@node-rs/argon2");
    const debil = await hash(CLAVE, { memoryCost: 19456, timeCost: 2, parallelism: 1 });
    expect(await verificarContrasena(CLAVE, debil)).toEqual({ valida: true, necesitaRehash: true });
  });

  it("la contraseña mala no pide re-hash, aunque el hash sea débil", async () => {
    const { hash } = await import("@node-rs/argon2");
    const debil = await hash(CLAVE, { memoryCost: 19456, timeCost: 2, parallelism: 1 });
    expect(await verificarContrasena("otra", debil)).toEqual({ valida: false, necesitaRehash: false });
  });
});

describe("formatos legados", () => {
  const texto: Legado = {
    nombre: "prueba",
    reconoce: (a) => a.startsWith("legado$"),
    verificar: async (p, a) => a === `legado$${p}`,
  };

  it("autentican sólo si el proyecto los declara, y siempre piden re-hash", async () => {
    expect(await verificarContrasena(CLAVE, `legado$${CLAVE}`)).toEqual({ valida: false, necesitaRehash: false });
    expect(await verificarContrasena(CLAVE, `legado$${CLAVE}`, [texto])).toEqual({ valida: true, necesitaRehash: true });
    expect(await verificarContrasena("otra", `legado$${CLAVE}`, [texto])).toEqual({ valida: false, necesitaRehash: false });
  });

  it("un almacenado vacío no autentica aunque algún legado lo reconozca", async () => {
    const todo: Legado = { nombre: "todo", reconoce: () => true, verificar: async () => true };
    expect(await verificarContrasena(CLAVE, "", [todo])).toEqual({ valida: false, necesitaRehash: false });
  });

  it("un hash que nadie reconoce, o malformado, no autentica ni lanza", async () => {
    expect((await verificarContrasena(CLAVE, "texto-cualquiera", [texto])).valida).toBe(false);
    expect((await verificarContrasena(CLAVE, "$argon2id$roto")).valida).toBe(false);
    expect((await verificarContrasena(CLAVE, "")).valida).toBe(false);
  });
});

describe("cuenta inexistente", () => {
  it("cuesta lo mismo que una verificación real", async () => {
    const h = await hashContrasena(CLAVE);
    await verificarEnVacio(CLAVE); // el primer uso calcula el relleno
    // El mínimo de varias medidas: una sola la estropea cualquier otra suite que corra a la vez.
    const minimo = async (trabajo: () => Promise<unknown>) => {
      let m = Infinity;
      for (let i = 0; i < 5; i++) { const t = performance.now(); await trabajo(); m = Math.min(m, performance.now() - t); }
      return m;
    };
    const real = await minimo(() => verificarContrasena("otra", h));
    const vacio = await minimo(() => verificarEnVacio("otra"));
    expect(vacio).toBeGreaterThan(real * 0.5);
  });

  it("una contraseña por encima del máximo sale igual de rápido con cuenta que sin ella", async () => {
    const larga = "x".repeat(LONGITUD_MAXIMA + 1);
    const h = await hashContrasena(CLAVE);
    await verificarEnVacio(CLAVE);
    const t0 = performance.now(); await verificarEnVacio(larga); const vacio = performance.now() - t0;
    const t1 = performance.now(); await verificarContrasena(larga, h); const real = performance.now() - t1;
    expect(vacio).toBeLessThan(5); // ni una derivación: sale en el control de longitud
    expect(real).toBeLessThan(5);
  });

  it("el estándar es el que dice la documentación", () => {
    expect(PARAMETROS).toEqual({ memoryCost: 65536, timeCost: 3, parallelism: 4 });
  });
});
