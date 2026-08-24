import { X509Certificate } from "node:crypto";
import { rootCertificates } from "node:tls";
import { describe, expect, it } from "vitest";
import { bcvIntermediatePem, createBcvAgent } from "./bcv-tls.js";

/**
 * El BCV publica una cadena TLS incompleta y la tentación es apagar la
 * verificación. Estas pruebas existen para que ese atajo no pase inadvertido.
 */

describe("agente TLS del BCV", () => {
  it("mantiene la verificación de certificado activa", () => {
    const agent = createBcvAgent();
    // `undefined` también vale: el valor por defecto de Node es verificar.
    expect(agent.options.rejectUnauthorized).not.toBe(false);
  });

  it("aporta el intermedio ausente sin descartar las raíces habituales", () => {
    const ca = createBcvAgent().options.ca as string[];
    expect(ca[0]).toBe(bcvIntermediatePem);
    expect(ca.length).toBe(rootCertificates.length + 1);
  });

  it("el intermedio es el que emite el certificado del BCV y sigue vigente", () => {
    const intermediate = new X509Certificate(bcvIntermediatePem);
    expect(intermediate.subject).toContain("Sectigo Public Server Authentication CA DV R36");
    // Si caduca, la consulta empezará a fallar: mejor enterarse por una prueba.
    expect(new Date(intermediate.validTo).getTime()).toBeGreaterThan(Date.now());
  });

  it("la raíz que lo firma ya viene en el almacén de Node", () => {
    const issuer = new X509Certificate(bcvIntermediatePem).issuer;
    expect(issuer).toContain("Sectigo Public Server Authentication Root R46");
    const root = rootCertificates.some((pem) => {
      try {
        return new X509Certificate(pem).subject.includes("Sectigo Public Server Authentication Root R46");
      } catch {
        return false;
      }
    });
    expect(root).toBe(true);
  });
});
