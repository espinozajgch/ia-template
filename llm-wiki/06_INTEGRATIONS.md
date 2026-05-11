# Integrations — Servicios Externos

> Generado por el System Pilot en Fase B (Blueprint) y verificado en Fase L (Link).

---

## Inventario de Integraciones

> Se completa con la respuesta a la Pregunta 2 del Blueprint (Integraciones).

### Template por Integración

```
## [Nombre del Servicio]

| Campo | Valor |
|---|---|
| Tipo | [API REST / GraphQL / SDK / Webhook / Base de datos] |
| Propósito | [qué hace este servicio en el sistema] |
| Endpoint base | [URL o host] |
| Autenticación | [API Key / OAuth / Bearer Token / Basic Auth] |
| Variable en .env | [NOMBRE_DE_LA_KEY] |
| Script de verificación | tools/verify_[servicio].py |
| Estado | VERIFICADO / PENDIENTE / ROTO |
| Rate limit | [requests/min o requests/día si aplica] |
| Documentación | [URL de la doc oficial] |
```

---

## Variables de Entorno Requeridas

Todas las credenciales van en `.env` — nunca hardcoded, nunca en Git.

```env
# [SERVICIO_1]
[NOMBRE_KEY_1]=

# [SERVICIO_2]
[NOMBRE_KEY_2]=
```

---

## Estado de Verificación (Fase L)

| Servicio | Handshake | Fecha | Notas |
|---|---|---|---|
| [PENDIENTE] | PENDIENTE | [FECHA] | |

---

## Dependencias entre Integraciones

Si el sistema falla, este es el orden de impacto:

```
[PENDIENTE — se llena con las integraciones reales del proyecto]
```

---

## Reglas de Integración

1. Nunca usar una integración sin verificar el Link primero
2. Si una integración falla, detener el flujo que depende de ella
3. Las credenciales siempre desde `.env`, nunca literales en el código
4. Documentar rate limits — el sistema no debe excederlos sin control
