# Plantillas de integración continua

> El kit predicaba la puerta de calidad sin traer un solo fichero que la ejecutara.
> Esto lo arregla.

Cuatro workflows de GitHub Actions. **La CI es la fuente de verdad de la puerta**: lo que
corre aquí es lo que hay que poder correr en local antes de commitear, y lo que
`agente/tools/puerta.sh` busca cuando descubre el proyecto.

| Workflow | Qué gatea | Cuándo instalarlo |
|---|---|---|
| `calidad.yml` | tipos · lint · ratchets · verificadores estructurales · build · cobertura | siempre |
| `integracion.yml` | migraciones idempotentes · SQL real · aislamiento · deriva de esquema | si hay base de datos |
| `e2e.yml` | la suite canónica de cinco specs con navegador real | si hay interfaz |
| `secretos.yml` | secretos en ficheros trackeados y en la URL del remoto | siempre |

## Instalación

El instalador los deja en `agente/ci/` **sin activarlos**: copiarlos a
`.github/workflows/` es un paso consciente, porque cada uno asume nombres de scripts que
hay que ajustar.

```bash
cp agente/ci/github/calidad.yml .github/workflows/
```

## Qué ajustar antes de activarlos

1. **La matriz `proyecto`** de `calidad.yml` — tus subdirectorios, o `[.]` si es uno solo.
2. **Los nombres de los scripts.** Las plantillas usan `typecheck`, `lint`, `ratchets`,
   `build`, `coverage`, `test:integration`, `db:migrate`, `db:seed`, `db:check-drift`.
   Los que no existan se saltan con `--if-present`, pero **un paso que se salta en silencio
   no gatea nada**: revisa la salida la primera vez.
3. **`npm audit`** viene con `continue-on-error: true` para que puedas instalarlo hoy.
   Ponlo en `false` en cuanto el proyecto esté limpio, o no sirve para nada.

## La regla que las hace útiles

**Lo que está en la CI se corre en local antes de subir.** Si CI está en verde y en local
no se corrió lo mismo, no se verificó nada: se adivinó. Por eso el hook de pre-push del kit
recuerda el e2e — es el paso que más veces se saltó y el que más regresiones dejó pasar.

## Otros proveedores

Las plantillas son de GitHub Actions porque es lo que usan todos los proyectos de esta
cantera. La forma se traslada sin cambios a GitLab CI, Circle o Jenkins: los pasos y su
orden son lo que importa, no la sintaxis.
