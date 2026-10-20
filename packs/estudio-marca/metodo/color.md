# Color: roles, accesibilidad y criterios

## Roles de una paleta de cinco colores

| Rol | Función | Regla |
|---|---|---|
| **Principal** | El color de acción: botones principales y elemento activo | Uno solo. Lo que se pulsa tiene ese color |
| **Acento 1** | Firma de marca o color funcional de apoyo (enlaces, foco) | Nunca indica un estado |
| **Acento 2** | Un segundo mensaje de marca: un módulo, un público, un valor | Nunca indica un estado |
| **Neutro oscuro** | Menú, fondos institucionales, modo oscuro, texto | ≥ 7:1 frente al neutro claro |
| **Neutro claro** | Fondo general; tarjetas en blanco encima | — |

En `paleta.json`, `enlace` dice qué rol colorea los enlaces y el foco, y `firma` qué rol
firma la marca (rótulos, filetes). Si el principal no sirve como texto en claro (el oro, por
ejemplo), los enlaces pasan a un acento: eso son **dos colores funcionales** y se dice.

## Cada color expresa un valor

Cada uno de los cinco colores se asocia a un valor de `01-valores.md` y lleva:
- un **nombre evocador** tomado del vocabulario del sector (en fútbol: Pizarra, Vestuario,
  Césped, Cal, Brazalete), nunca "Azul 500";
- una **descripción** de una frase que conecta color y valor;
- un **uso** concreto.

## Umbrales de contraste (WCAG 2.x)

| Ratio | Sirve para |
|---|---|
| ≥ 7:1 | AAA. Texto normal en cualquier contexto |
| ≥ 4,5:1 | AA. Texto normal |
| ≥ 3:1 | Texto grande (≥ 24 px, o ≥ 18,66 px en negrita), iconos, bordes de control y foco (1.4.11) |
| < 3:1 | No apto para texto ni para elementos de interfaz que transmiten información |

**Con neutros reales, ningún color es texto AA a la vez sobre el claro y sobre el oscuro.**
Sobre un claro como `#f7f6f3` la luminancia del color debe ser ≤ 0,17; sobre un oscuro como
`#14181f`, ≥ 0,22. Solo con blanco puro y negro puro existe una franja estrecha
(luminancia 0,175–0,183: `#767676` da 4,54 y 4,62:1), que desaparece en cuanto los neutros
se apartan un poco de los extremos. Por eso cada cromático declara su variante:
- `variante_oscuro`: para texto o etiquetas sobre el neutro oscuro.
- `variante_claro`: para texto sobre claro cuando el color base no llega (el oro).

Lo que sí es posible y conviene buscar es un acento que cumpla **4,5:1 sobre el claro y 3:1
sobre el oscuro**: así sirve como foco y elemento de interfaz en los dos temas
(`color.py buscar` con dos restricciones).

El texto sobre un color se elige entre blanco y el neutro oscuro, el que dé más contraste.
Los dorados y amarillos llevan texto oscuro, nunca blanco.

## Estados semánticos

1. Inventaría los tokens de estado del proyecto (éxito, aviso, error, información). Están en
   el CSS o en la configuración del sistema de diseño. Usa esos valores, no unos genéricos.
2. Ningún acento debe quedar a menos de **30°** de tono de un estado
   (`color.py estados`). Por debajo, se lee como estado.
3. Las **categorías** (badges por tipo, `--cat-*`) no cuentan: suelen cubrir todo el círculo.
4. El color de **enlace** se excluye: enlaces e información comparten azul por convención.
5. Los **neutros** no tienen tono comparable. Se detectan por croma CIELAB < 12, no por
   saturación HSL, que engaña en colores muy oscuros.

## Daltonismo

Se simulan deuteranopía, protanopía y tritanopía (Machado 2009) y se mide ΔE76 entre los dos
acentos (`color.py daltonismo`). Heurística:

| ΔE mínimo con daltonismo | Juicio |
|---|---|
| ≥ 20 | Sirven como series de un gráfico sin etiqueta |
| 15–20 | Distinguibles si llevan etiqueta o forma |
| < 15 | Se confunden. Separa luminosidad, no solo tono |

Dos colores con luminancia parecida (ratio < 1,5 entre ellos) se separan solo por tono, y
el daltonismo rojo-verde convierte violetas en azules. Mídelo antes de prometer nada (AP-M08).

## Proporción de uso

Partiendo de 60-30-10: neutro claro 55–60 %, neutro oscuro 20–30 %, principal ~10 %,
acentos 2–5 % entre los dos. La proporción va en la franja de la hoja y debe sumar 100.

## Armonía

- **Temperatura:** un claro cálido junto a un oscuro frío puede chocar. Reduce el croma del
  claro (diferencia R−B de 7 a 4, por ejemplo) o templa el oscuro.
- **Icono o logo:** muestrea su fondo (`color.py muestra-png`) y armoniza el neutro oscuro
  con él, para que el icono no parezca un recorte.
- **Sobriedad:** si la personalidad es sobria, busca acentos con saturación moderada
  (`--sat 40-60`). La saturación alta da energía pero puede leerse como consumo masivo.

## Herramientas

| Necesitas | Comando |
|---|---|
| Ratio de un par | `color.py contraste TEXTO FONDO` |
| Un tono que cumpla varios contrastes | `color.py buscar --tono N --restriccion "#fondo:min" …` |
| La variante de un color para un fondo | `color.py variante HEX --fondo HEX --min 4.5` |
| Distancia a los estados | `color.py estados HEX --estados …` |
| Separación con daltonismo | `color.py daltonismo A B` |
| Tono, croma, luminancia | `color.py info HEX` |
| Validar una paleta entera | `color.py validar paleta.json` |
