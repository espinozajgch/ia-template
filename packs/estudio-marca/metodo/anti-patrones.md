# Anti-patrones del estudio de marca

Cada uno salió de un caso real —ES UN EJEMPLO DE OTRO PROYECTO: el primer estudio de marca
hecho con este método— o de errores evitados en él. Se citan por ID al corregir:
"Corregido (AP-M05)".

| ID | Anti-patrón | Por qué es un problema | Qué se hace |
|---|---|---|---|
| AP-M01 | Escribir ratios de contraste de memoria o redondeados a ojo | Un 4,36 parece un 4,5 y no cumple AA | Toda cifra sale de `herramientas/` |
| AP-M02 | Fiarse de la guía de marca sin mirar el código | En el caso de referencia convivían tres navy distintos y la guía solo nombraba uno | `color.py extraer` antes de describir la identidad actual |
| AP-M03 | Proponer un acento sin medir su distancia a los estados | Un turquesa a 12° del verde de éxito se lee como "correcto" | `color.py estados` con los tokens reales del proyecto |
| AP-M04 | Prometer una opción "sin contras" | Mezcla defectos de diseño con costes que ninguna paleta evita | Separar diseño, costes inherentes y reglas de uso (`metodo/sintesis.md`) |
| AP-M05 | Mantener una afirmación que un dato posterior desmiente | Erosiona la confianza en todo el análisis | Corregir en el entregable y en la respuesta, con la cifra |
| AP-M06 | Afirmar hechos de mercado sin fuente ("ningún SaaS usa oro") | Es falso o no verificable | Formular como tendencia, con cautela, o buscar la fuente |
| AP-M07 | Presentar variaciones de tono como opciones distintas | El usuario no puede elegir una estrategia | Una ruta = una tesis: qué valor lleva el peso |
| AP-M08 | Dar por distinguibles dos acentos con la misma luminosidad | Con daltonismo pueden confundirse | `color.py daltonismo` y, si ΔE < 20, exigir etiquetas |
| AP-M09 | Usar un color de marca como indicador de estado | Rompe el significado de los estados del producto | Regla "los acentos no son estados" en cada paleta |
| AP-M10 | Listar valores que son adjetivos de percepción | "Confianza" no es una conducta comprobable | Valor = compromiso con prueba en el producto |
| AP-M11 | Modificar el proyecto analizado sin petición | El análisis es de solo lectura | Proponer en `knowledge/estudios-marca/<slug>/`; aplicar solo si se pide |
| AP-M12 | Usar las categorías como criterio de colisión | Las paletas categóricas ocupan todo el círculo y bloquean cualquier tono | Comparar solo con los estados semánticos |
| AP-M13 | Detectar neutros por saturación HSL | `#14181f` da 22 % y es un gris | Croma CIELAB < 12 |
| AP-M14 | Editar a mano la hoja HTML generada | La siguiente generación borra el cambio y las cifras pueden divergir | Corregir `paleta.json` y regenerar |
| AP-M15 | Contar con un color como texto AA sobre el claro y sobre el oscuro de la paleta | Con neutros reales es imposible por aritmética (solo hay franja con blanco y negro puros) | Declarar `variante_oscuro` o `variante_claro` |
