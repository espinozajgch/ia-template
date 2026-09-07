/**
 * Selector con el patrón WAI-ARIA de «combobox de solo selección».
 *
 * ── Por qué no vale el `<select>` nativo ─────────────────────────────────────
 * Porque no se puede dar estilo a sus opciones de forma consistente entre navegadores.
 * Ese es el motivo real, y conviene decirlo: si el nativo te sirve, ÚSALO — trae gratis
 * el teclado, el anuncio y el comportamiento del móvil.
 *
 * ── Por qué no vale un `<div onClick>` ───────────────────────────────────────
 * Es la alternativa que se escribe cuando el nativo no encaja, y no es operable con
 * teclado ni existe para un lector de pantalla. Este componente es el precio de querer
 * estilo propio: teclado completo (↑ ↓ Inicio Fin Enter Escape y búsqueda por tecleo),
 * roles `combobox`/`listbox`/`option` y `aria-activedescendant`.
 *
 * Acepta los mismos `<option>` que el nativo, para poder sustituirlo sin tocar el resto.
 */
import { Children, isValidElement, useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';

function textoDe(nodo: ReactNode): string {
  if (nodo === null || nodo === undefined) return '';
  if (typeof nodo === 'string' || typeof nodo === 'number') return String(nodo);
  if (Array.isArray(nodo)) return nodo.map(textoDe).join('');
  if (isValidElement(nodo)) return textoDe((nodo as { props?: { children?: ReactNode } }).props?.children);
  return '';
}

type Opcion = { valor: string; texto: string; nodo: ReactNode };

/**
 * Recoge los `<option>` atravesando fragmentos y arrays.
 *
 * `Children.toArray` NO desenvuelve un fragmento: si las opciones llegan dentro de `<>…</>`
 * —que es lo natural cuando se guardan en una variable o salen de un `.map()` envuelto—
 * ve un solo hijo y la lista queda vacía, sin ningún error. Aparecía todo bien y no
 * funcionaba nada.
 */
function recogerOpciones(nodo: ReactNode, acc: Opcion[] = []): Opcion[] {
  for (const hijo of Children.toArray(nodo)) {
    if (!isValidElement(hijo)) continue;
    if (hijo.type === 'option') {
      const p = hijo.props as { value?: string; children?: ReactNode };
      const texto = textoDe(p.children);
      acc.push({ valor: p.value !== undefined ? String(p.value) : texto, texto, nodo: p.children });
    } else {
      // Fragmentos, y cualquier envoltorio que solo agrupe: se atraviesan.
      const p = hijo.props as { children?: ReactNode };
      if (p?.children) recogerOpciones(p.children, acc);
    }
  }
  return acc;
}

type SelectorProps = {
  children: ReactNode;
  value?: string | number;
  onChange?: (e: { target: { value: string; name: string } }) => void;
  name?: string;
  disabled?: boolean;
  id?: string;
  marcador?: string;
  className?: string;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
  'aria-label'?: string;
};

const MS_TECLEO = 500;   // pasado este tiempo, la búsqueda por tecleo empieza de cero

export function Selector({
  children, value, onChange, name = '', disabled, id,
  marcador = 'Selecciona…', className = '', ...aria
}: SelectorProps) {
  const [abierto, setAbierto] = useState(false);
  const [activaCruda, setActiva] = useState(-1);
  const contenedor = useRef<HTMLDivElement>(null);
  const disparador = useRef<HTMLButtonElement>(null);
  const lista = useRef<HTMLDivElement>(null);
  const tecleo = useRef({ texto: '', ts: 0 });
  const idLista = useId();

  const opciones = recogerOpciones(children);

  const seleccionada = opciones.findIndex(o => o.valor === String(value ?? ''));

  /*
   * El cursor de teclado, SIEMPRE dentro de la lista.
   *
   * `activaCruda` es estado y sobrevive a los renderizados; `opciones` se recalcula de
   * `children` en CADA uno. En cuanto las dos dejan de coincidir, el índice guardado apunta
   * fuera y `opciones[activa]` es `undefined`. Pasa por tres caminos, y ninguno es raro:
   *
   *   1. La lista llega vacía —«elige provincia» antes de elegir país, o una lista que viene
   *      de una API que devolvió cero—. El efecto de apertura pone el cursor en 0 aunque no
   *      haya ninguna opción, y el primer Enter estalla.
   *   2. Igual, pulsando Inicio: pone el cursor en 0 sin mirar si hay algo.
   *   3. La lista ENCOGE mientras está abierta, porque depende de otro campo. El cursor se
   *      queda donde estaba, ahora fuera.
   *
   * Se corrige en la derivación y no en el sitio donde estalla, porque hay SEIS lecturas de
   * `activa` —el Enter, el `aria-activedescendant`, el resaltado, el desplazamiento…— y
   * parchear solo la que rompe deja las otras cinco apuntando fuera igual.
   */
  const activa = activaCruda < opciones.length ? activaCruda : -1;
  const opcionActiva = activa >= 0 ? opciones[activa] : undefined;

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      if (contenedor.current && !contenedor.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener('mousedown', fuera);
    return () => document.removeEventListener('mousedown', fuera);
  }, [abierto]);

  useEffect(() => {
    // Al abrir, el cursor de teclado va a la seleccionada. Pero si la búsqueda por tecleo
    // ya movió el cursor durante la apertura, se respeta lo que ella eligió.
    if (abierto) setActiva(p => (p >= 0 ? p : seleccionada >= 0 ? seleccionada : 0));
    else setActiva(-1);
     
  }, [abierto]);

  useEffect(() => {
    if (!abierto || activa < 0 || !lista.current) return;
    const el = lista.current.querySelector<HTMLElement>(`[data-i="${activa}"]`);
    // jsdom no implementa scrollIntoView: sin esta guarda, los tests fallan por el entorno.
    if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'nearest' });
  }, [activa, abierto]);

  const elegir = (valor: string) => {
    onChange?.({ target: { value: valor, name } });
    setAbierto(false);
    disparador.current?.focus();   // el foco vuelve al disparador, no se pierde
  };

  const buscarPorTecleo = (tecla: string) => {
    const ahora = Date.now();
    const t = tecleo.current;
    t.texto = (ahora - t.ts < MS_TECLEO ? t.texto : '') + tecla.toLowerCase();
    t.ts = ahora;
    const i = opciones.findIndex(o => o.texto.toLowerCase().startsWith(t.texto));
    if (i >= 0) { if (!abierto) setAbierto(true); setActiva(i); }
  };

  const alPulsarTecla = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        abierto ? setActiva(Math.min(opciones.length - 1, activa + 1)) : setAbierto(true);
        break;
      case 'ArrowUp':
        e.preventDefault();
        abierto ? setActiva(Math.max(0, (activa < 0 ? opciones.length : activa) - 1)) : setAbierto(true);
        break;
      case 'Home': if (abierto) { e.preventDefault(); setActiva(0); } break;
      case 'End':  if (abierto) { e.preventDefault(); setActiva(opciones.length - 1); } break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (abierto && opcionActiva) elegir(opcionActiva.valor); else setAbierto(true);
        break;
      case 'Escape':
        // Escape cierra sin elegir. Es lo que espera quien lo pulsa, y lo que hace el nativo.
        if (abierto) { e.preventDefault(); setAbierto(false); }
        break;
      case 'Tab':
        setAbierto(false);   // salir del control lo cierra: no puede quedarse flotando
        break;
      default:
        if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) buscarPorTecleo(e.key);
    }
  };

  const actual = seleccionada >= 0 ? opciones[seleccionada] : null;

  return (
    <div ref={contenedor} className={`selector ${className}`}>
      <button
        ref={disparador}
        type="button"
        id={id}
        role="combobox"
        aria-expanded={abierto}
        aria-haspopup="listbox"
        aria-controls={idLista}
        aria-activedescendant={abierto && activa >= 0 ? `${idLista}-${activa}` : undefined}
        disabled={disabled}
        onClick={() => !disabled && setAbierto(a => !a)}
        onKeyDown={alPulsarTecla}
        className={`control selector-disparador ${!actual ? 'esta-vacio' : ''}`}
        {...aria}
      >
        <span className="selector-valor">{actual ? actual.nodo : marcador}</span>
        <span className="selector-flecha" aria-hidden="true">▾</span>
      </button>

      {abierto && (
        <div ref={lista} id={idLista} role="listbox" className="selector-lista"
             aria-label={aria['aria-label']}>
          {opciones.map((o, i) => (
            <div
              key={o.valor}
              id={`${idLista}-${i}`}
              data-i={i}
              role="option"
              aria-selected={i === seleccionada}
              // El resaltado del teclado y la selección son cosas DISTINTAS: se puede
              // estar recorriendo la lista sin haber elegido nada.
              className={`selector-opcion ${i === activa ? 'esta-activa' : ''} ${i === seleccionada ? 'esta-elegida' : ''}`}
              onMouseEnter={() => setActiva(i)}
              onClick={() => elegir(o.valor)}
            >
              {o.nodo}
            </div>
          ))}
          {opciones.length === 0 && <div className="selector-vacio">Sin opciones</div>}
        </div>
      )}
    </div>
  );
}
