import { describe, expect, it } from "vitest";
import { generateKeyPairSync, randomBytes } from "node:crypto";
import { SuscripcionInvalida, servicioAdmitido, validarSuscripcion } from "./suscripcion-push";

/** Claves como las genera un navegador: punto P-256 sin comprimir y 16 bytes de `auth`. */
function clavesReales() {
  const { publicKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const punto = publicKey.export({ format: "der", type: "spki" }).subarray(-65);
  return { p256dh: punto.toString("base64url"), auth: randomBytes(16).toString("base64url") };
}
const suscripcion = (endpoint: string, keys = clavesReales()) => ({ endpoint, keys });

describe("validarSuscripcion — endpoints de navegadores reales", () => {
  for (const endpoint of [
    "https://fcm.googleapis.com/fcm/send/abc:APA91b",
    "https://updates.push.services.mozilla.com/wpush/v2/gAAAA",
    "https://web.push.apple.com/QGuQyavXutnMei",
    "https://wns2-par02p.notify.windows.com/w/?token=BQYAAAC",
  ]) {
    it(`admite ${new URL(endpoint).hostname}`, () => {
      expect(validarSuscripcion(suscripcion(endpoint)).endpoint).toBe(endpoint);
    });
  }
});

describe("validarSuscripcion — lo que abriría un SSRF", () => {
  for (const [motivo, endpoint] of [
    ["un servicio interno", "https://10.0.0.5/admin"],
    ["metadatos de la nube por http", "http://169.254.169.254/latest/meta-data/"],
    ["http aunque el anfitrión sea bueno", "http://fcm.googleapis.com/fcm/send/abc"],
    ["un anfitrión que sólo lo parece", "https://fcm.googleapis.com.atacante.com/x"],
    ["un sufijo sin punto", "https://evilnotify.windows.com/w/"],
    ["credenciales en la URL", "https://u:p@fcm.googleapis.com/fcm/send/abc"],
    ["otro puerto", "https://fcm.googleapis.com:8443/fcm/send/abc"],
    ["un fragmento", "https://fcm.googleapis.com/fcm/send/abc#x"],
    ["sin ruta", "https://fcm.googleapis.com/"],
    ["demasiado larga", `https://fcm.googleapis.com/${"a".repeat(4100)}`],
    ["no es una URL", "fcm.googleapis.com/fcm"],
  ]) {
    it(`rechaza ${motivo}`, () => {
      expect(() => validarSuscripcion(suscripcion(endpoint))).toThrow(SuscripcionInvalida);
    });
  }

  it("el máximo exacto de longitud vale; uno más, no", () => {
    const base = "https://fcm.googleapis.com/";
    expect(validarSuscripcion(suscripcion(base + "a".repeat(4096 - base.length))).endpoint).toHaveLength(4096);
    expect(() => validarSuscripcion(suscripcion(base + "a".repeat(4097 - base.length)))).toThrow(/dirección de notificaciones/);
  });

  it("un endpoint que no es texto no se convierte en uno", () => {
    // `new URL(["https://…"])` lo aceptaría: el array se vuelve cadena.
    expect(() => validarSuscripcion({ endpoint: ["https://fcm.googleapis.com/fcm/send/x"], keys: clavesReales() }))
      .toThrow(/dirección de notificaciones/);
  });

  it("cada rechazo dice por qué, en palabras que se pueden enseñar", () => {
    expect(() => validarSuscripcion(suscripcion("https://10.0.0.5/x"))).toThrow(/servicio de notificaciones admitido/);
    expect(() => validarSuscripcion(suscripcion("no-url"))).toThrow(/dirección de notificaciones válida/);
    expect(() => validarSuscripcion({ endpoint: "https://fcm.googleapis.com/fcm/send/x", keys: {} })).toThrow(/claves del dispositivo/);
  });

  it("un anfitrión extra sólo si el proyecto lo declara", () => {
    const endpoint = "https://push.otro-navegador.example/x";
    expect(() => validarSuscripcion(suscripcion(endpoint))).toThrow(SuscripcionInvalida);
    expect(validarSuscripcion(suscripcion(endpoint), ["push.otro-navegador.example"]).endpoint).toBe(endpoint);
  });
});

describe("validarSuscripcion — claves del navegador", () => {
  const endpoint = "https://fcm.googleapis.com/fcm/send/abc";
  it("rechaza un p256dh que no es un punto de la curva", () => {
    const falso = Buffer.concat([Buffer.from([4]), randomBytes(64)]).toString("base64url");
    expect(() => validarSuscripcion(suscripcion(endpoint, { ...clavesReales(), p256dh: falso }))).toThrow(SuscripcionInvalida);
  });
  it("rechaza un p256dh con la longitud equivocada o comprimido", () => {
    expect(() => validarSuscripcion(suscripcion(endpoint, { ...clavesReales(), p256dh: randomBytes(33).toString("base64url") }))).toThrow(SuscripcionInvalida);
  });
  it("rechaza un auth que no mide 16 bytes", () => {
    expect(() => validarSuscripcion(suscripcion(endpoint, { ...clavesReales(), auth: randomBytes(12).toString("base64url") }))).toThrow(/claves del dispositivo/);
  });
  it("rechaza un punto sin el prefijo de sin comprimir", () => {
    const punto = Buffer.from(clavesReales().p256dh, "base64url"); punto[0] = 0x05;
    expect(() => validarSuscripcion(suscripcion(endpoint, { ...clavesReales(), p256dh: punto.toString("base64url") }))).toThrow(/claves del dispositivo/);
  });
  it("rechaza claves ausentes, de otro tipo o enormes", () => {
    const buenas = clavesReales();
    for (const keys of [undefined, {}, { p256dh: 1, auth: 2 }, { p256dh: buenas.p256dh, auth: 5 },
      { p256dh: 5, auth: buenas.auth }, { ...buenas, auth: "a".repeat(201) }, { ...buenas, p256dh: "a".repeat(201) }]) {
      expect(() => validarSuscripcion({ endpoint, keys })).toThrow(/claves del dispositivo/);
    }
    expect(() => validarSuscripcion(null)).toThrow(SuscripcionInvalida);
  });
  it("devuelve sólo lo que hay que guardar", () => {
    const keys = clavesReales();
    expect(validarSuscripcion({ endpoint, keys, expirationTime: 1, extra: "x" })).toEqual({ endpoint, keys });
  });
});

describe("servicioAdmitido", () => {
  it("no distingue mayúsculas y exige el punto antes del dominio", () => {
    expect(servicioAdmitido("FCM.GOOGLEAPIS.COM")).toBe(true);
    expect(servicioAdmitido("notify.windows.com")).toBe(true);
    expect(servicioAdmitido("xnotify.windows.com")).toBe(false);
  });
});
