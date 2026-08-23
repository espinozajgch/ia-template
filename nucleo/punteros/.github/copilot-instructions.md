# Instrucciones para GitHub Copilot

El contexto completo de este proyecto está en `AGENTS.md`. Estas son las reglas que Copilot
debe aplicar al sugerir código.

- Respetar el stack y las convenciones declaradas en `AGENTS.md` §2 y §6.
- No sugerir credenciales, tokens ni cadenas de conexión literales: siempre desde variables
  de entorno.
- No sugerir dependencias nuevas sin que exista ya en el manifiesto del proyecto.
- Los tipos del dominio se definen en el fichero de tipos declarado en `AGENTS.md` §2, no
  ad hoc en cada archivo.
- Antes de proponer un patrón, comprobar que no está en `knowledge/wiki/anti-patterns.md`.
- Código nuevo nace con su test.
