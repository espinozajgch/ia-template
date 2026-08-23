# Pack · offline-first

**Se activa si:** la aplicación se usa donde la red falla — trabajo de campo, sótanos,
plantas, transporte, o simplemente móvil en un sitio con mala cobertura.

**Sale de** una aplicación clínica real cuyo personal captura fichas y resultados en
lugares sin cobertura.

---

## Qué instala

| Fichero | Qué resuelve |
|---|---|
| `cola.ts` | la bandeja de salida en el cliente · **14 tests** |
| `cola.test.ts` | incluidos los casos que la rompen |
| `idempotencia.sql` | la otra mitad: que el reintento no duplique |

> **Las dos mitades hacen falta.** Una cola que reintenta va a reenviar cosas; sin
> idempotencia en el servidor, el reintento de un cobro cobra dos veces. Instalar solo el
> cliente es construir la mitad que produce el daño.

---

## Las cuatro decisiones

### 1 · Lista blanca, no lista negra

**Lo que no está declarado no se encola.**

Al revés —encolar todo salvo lo prohibido— cada acción nueva que alguien añada al producto
quedaría encolable sin que nadie lo haya pensado. Y la que se colara sería justo la que no
debía: la que consume un correlativo o la que promete algo a un tercero.

```ts
const ENCOLABLES = {
  '/api/pacientes': ['crear', 'actualizar'],   // el identificador lo pone el servidor
  '/api/notas':     ['crear'],
  // '/api/facturas' NO: consume un número fiscal, exige conexión
  // '/api/correos'  NO: promete algo a alguien de fuera
};
```

**La frontera, en una frase:** lo que consume un correlativo o publica hacia fuera exige
conexión. El resto se captura y espera.

### 2 · FIFO estricta, no «reintentar lo que se pueda»

Hay **causalidad** entre lo capturado: la corrección de una ficha va después de su alta, la
segunda tanda de resultados después de la primera. Enviar en desorden produce escrituras
que se pisan, y lo peor es que se pisan **en silencio**.

### 3 · Una rechazada detiene la cola

Las que van detrás **no se saltan**: se quedan detenidas y se enseñan.

Saltar la rechazada y seguir enviando es exactamente cómo se aplica una corrección sobre un
alta que nunca entró. Desbloquear es una decisión de una persona: `descartar()` quita la
rechazada y libera lo demás.

### 4 · Referencias provisionales de texto, no números

Un alta sin conexión no tiene identificador —lo pone el servidor—, así que lo que apunta a
ella lleva `tmp:9f3c…`.

Es una **cadena** y no un número negativo ni un cero porque tiene que ser **imposible de
confundir** con un identificador real. Si una referencia sin resolver se cuela hasta el
servidor, un número falla de formas creativas; una cadena la rechaza el validador de
enteros en el primer paso.

Y si al vaciar queda alguna sin resolver, la entrada **se detiene** en vez de salir rota.

---

## Lo que hay que decidir en cada proyecto

| Decisión | Por qué es tuya |
|---|---|
| Qué acciones entran en la lista blanca | depende de qué consume correlativos y qué sale hacia fuera |
| Dónde vive la cola | IndexedDB, almacenamiento local, base embebida |
| **Si se cifra** | lo que hay ahí suele ser **más** sensible que la copia de lectura: es lo único que existe de ese trabajo |
| Cuándo se vacía | al recuperar red, al abrir, con un botón — o las tres |
| Cuánto se conserva una mutación en el servidor | 30 días es razonable; un cliente que vuelve tras un mes trae trabajo que conviene revisar |

---

## Lo que el usuario tiene que ver

Una cola invisible es peor que no tener cola: el usuario cree que su trabajo se envió.

- **Cuántas cosas hay esperando**, siempre visible.
- **Qué se rechazó y por qué**, en palabras suyas, con la opción de descartarlo.
- **Que hay cosas detenidas** porque dependen de lo rechazado.
- Una pantalla propia de sin conexión, **no un error del navegador**.

---

## Checklist

- [ ] Lista blanca explícita; lo no declarado exige conexión
- [ ] La cola es FIFO estricta y una rechazada detiene lo que va detrás
- [ ] Toda mutación lleva su identificador, **igual en cada reintento**
- [ ] El servidor descarta duplicados por ese identificador — `idempotencia.sql` instalado
- [ ] Mismo identificador con otro cuerpo: **error**, no respuesta vieja
- [ ] Referencias provisionales de texto, y ninguna sale sin resolver
- [ ] La cola está cifrada si guarda algo sensible
- [ ] El usuario ve cuántas cosas esperan, qué se rechazó y por qué
- [ ] Hay pantalla propia de sin conexión — la prueba está en `packs/pwa-movil/e2e/pwa.spec.ts`
