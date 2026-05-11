# Tools — Catálogo de Herramientas

> Generado por el System Pilot en Fase L (Link).
> Cada tool se verifica antes de integrar en la lógica principal.

---

## Estado General de Conexiones

| Servicio | Estado | Última verificación |
|---|---|---|
| [PENDIENTE — se llena con respuestas de Integraciones] | PENDIENTE | [FECHA] |

---

## Catálogo de Tools

### Template por Tool

```
## [Nombre de la Tool]

- **Servicio:** [API / DB / servicio externo]
- **Propósito:** [qué hace esta tool en una oración]
- **Script de verificación:** tools/verify_[servicio].py
- **Input esperado:**
  - campo: tipo — descripción
- **Output esperado:**
  - campo: tipo — descripción
- **Estado:** VERIFICADO / PENDIENTE / ROTO
- **Error conocido:** [si aplica]
```

---

## Reglas de Uso de Tools

1. **Verificar antes de usar** — nunca llamar una tool sin confirmar que el Link está activo
2. **Una tool, una responsabilidad** — si una tool hace más de una cosa, dividirla
3. **Siempre registrar el resultado** — éxito o fallo, con contexto completo
4. **No continuar con tool rota** — detener y notificar al usuario

---

## Scripts de Verificación

Los scripts de verificación van en `tools/` y tienen esta estructura mínima:

```python
# tools/verify_[servicio].py
import os

def verify():
    # 1. Leer credencial
    key = os.getenv("[KEY_NAME]")
    if not key:
        raise ValueError("Credencial [KEY_NAME] no encontrada en .env")

    # 2. Hacer request mínimo
    # response = cliente.ping() o equivalente

    # 3. Confirmar respuesta
    print("[servicio]: CONECTADO")

if __name__ == "__main__":
    verify()
```

---

## Log de Ejecuciones

| Tool | Input | Output | Estado | Timestamp |
|---|---|---|---|---|
| [se llena en runtime] | | | | |
