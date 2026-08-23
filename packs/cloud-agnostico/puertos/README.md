# Puertos y adaptadores

> El pack pedía «que la aplicación no conozca al proveedor» y no lo demostraba con código.
> Aquí está el esqueleto, con el ejemplo que más veces hace falta: **almacenamiento**.

---

## La forma

```
        la aplicación
              │  habla solo con esta interfaz
              ▼
        ┌───────────┐
        │  Almacen  │  ← el PUERTO: qué se necesita, no cómo se hace
        └───────────┘
              ▲
      ┌───────┴───────┬──────────────┐
   Local           S3            EnMemoria      ← los ADAPTADORES
  (disco)       (la nube)        (los tests)
              ▲
        ┌───────────┐
        │  crear()  │  ← la FACTORÍA: elige por configuración, en un solo sitio
        └───────────┘
```

## Lo que gana, en concreto

**El sistema arranca entero en local**, sin credenciales de nube. Eso es lo que de verdad
acelera el trabajo: quien entra hoy al proyecto lo levanta hoy.

**Los tests no necesitan red.** El adaptador en memoria es diez líneas y hace que probar la
lógica de negocio sea instantáneo y determinista.

**Cambiar de proveedor es escribir un adaptador**, no buscar llamadas por todo el
repositorio. Y se puede tener los dos a la vez durante la migración.

## Las cuatro reglas

**1 · El puerto se define por lo que la aplicación NECESITA, no por lo que el proveedor
ofrece.** Si la interfaz tiene `putObjectWithServerSideEncryption`, no es un puerto: es S3
con otro nombre, y el día de la migración no sirve de nada.

**2 · Nada del proveedor cruza la frontera.** Ni tipos, ni errores, ni excepciones. El
adaptador traduce el fallo de S3 a un error del dominio; si deja escapar un
`NoSuchKey`, la aplicación acaba capturando errores de AWS y ya está atada.

**3 · La factoría es el único sitio que sabe qué implementación existe.** Un `if` sobre el
entorno repartido por el código es el mismo acoplamiento con más pasos.

**4 · El puerto lo justifica una razón concreta.** No todo merece uno. Si nunca vas a
cambiar de base de datos, una interfaz sobre el ORM es trabajo sin retorno. Almacenamiento,
correo, colas y secretos suelen merecerlo; el ORM casi nunca.

## Qué escribir

| Fichero | Qué contiene |
|---|---|
| `almacen.ts` / `almacen.py` | el puerto — la interfaz y los errores del dominio |
| `almacen.local.*` | disco: el que se usa en desarrollo |
| `almacen.memoria.*` | en memoria: el que usan los tests |
| `almacen.s3.*` | el proveedor real (aquí no se incluye: depende de tu SDK) |
| `crear.*` | la factoría, que elige por configuración |

**El contrato se prueba una vez contra todos los adaptadores.** Ver `almacen.contrato.test.ts`:
el mismo conjunto de pruebas corre contra cada implementación, así que un adaptador nuevo
está bien el día que pasa esas pruebas. Es lo que impide que «funciona en local y no en la
nube».
