/**
 * Campos de formulario con la accesibilidad puesta de fábrica.
 *
 * Portado de una implementación real, con dos cambios: los estilos salen de tokens CSS en
 * vez de clases de un framework concreto, y los componentes se declaran con nombre en
 * mayúscula para no tener que silenciar la regla de hooks —el original arrastraba cuatro
 * `eslint-disable` por usar minúsculas dentro de un objeto—.
 *
 * ── La idea que hay que entender ─────────────────────────────────────────────
 *
 * `Envoltorio` **inyecta solo** el `id`, el `htmlFor`, el `aria-invalid` y el
 * `aria-describedby` en el control que envuelve, y pinta el error en un `role="alert"`.
 *
 * Quien escribe el formulario no necesita saber qué es `aria-describedby`: le sale bien
 * igual. Esa es la diferencia entre una regla y un mecanismo — el proyecto de origen pasó
 * de **cero** ocurrencias de `aria-invalid` a todas, y no fue formando al equipo: fue
 * haciendo que el camino fácil fuera el correcto.
 */
import { Children, cloneElement, forwardRef, isValidElement, useId } from 'react';
import type { ReactElement, ReactNode } from 'react';

// ── Envoltorio ────────────────────────────────────────────────────────────────
type EnvoltorioProps = {
  etiqueta: ReactNode;
  children: ReactNode;
  obligatorio?: boolean;
  /** Mensaje de error. Su sola presencia marca el control como inválido. */
  error?: ReactNode;
  /** Texto de ayuda permanente, distinto del error. */
  ayuda?: ReactNode;
  className?: string;
};

type PropsInyectables = {
  id?: string;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
};

export function Envoltorio({ etiqueta, children, obligatorio, error, ayuda, className }: EnvoltorioProps) {
  const idGenerado = useId();
  const idError = useId();
  const idAyuda = useId();

  const hijos = Children.toArray(children);
  const primero = hijos.findIndex(isValidElement);
  let idEfectivo = idGenerado;

  if (primero >= 0) {
    const control = hijos[primero] as ReactElement<PropsInyectables>;
    const extra: PropsInyectables = {};

    // Si el control ya trae id propio se respeta: puede estar referenciado desde fuera.
    if (control.props.id) idEfectivo = control.props.id;
    else extra.id = idGenerado;

    // `aria-describedby` admite varios ids separados por espacio: ayuda Y error.
    const descrito = [ayuda ? idAyuda : null, error ? idError : null].filter(Boolean).join(' ');
    if (descrito) extra['aria-describedby'] = descrito;
    if (error) extra['aria-invalid'] = true;

    if (Object.keys(extra).length) hijos[primero] = cloneElement(control, extra);
  }

  return (
    <div className={`campo ${className ?? ''}`}>
      <label className="campo-etiqueta" htmlFor={idEfectivo}>
        {etiqueta}
        {/* El asterisco es decorativo: lo que comunica la obligatoriedad al lector de
            pantalla es `required` en el propio control, no este símbolo. */}
        {obligatorio && <span className="campo-obligatorio" aria-hidden="true">*</span>}
      </label>
      {hijos}
      {ayuda && <p id={idAyuda} className="campo-ayuda">{ayuda}</p>}
      {/* role="alert" hace que un lector de pantalla lo anuncie al aparecer, sin que el
          usuario tenga que ir a buscarlo. */}
      {error && <p id={idError} role="alert" className="campo-error">{error}</p>}
    </div>
  );
}

// ── Primitivos ────────────────────────────────────────────────────────────────
// Existen para que en la aplicación NO haya <input> ni <textarea> sueltos: si los hay,
// cada formulario acaba con su propio foco, su propio error y su propio deshabilitado.
// El detector `inputs-nativos` del kit vigila justo eso.

export const Entrada = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Entrada({ className = '', ...props }, ref) {
    return <input ref={ref} {...props} className={`control ${className}`} />;
  },
);

export const AreaTexto = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function AreaTexto({ className = '', rows = 3, ...props }, ref) {
    return <textarea ref={ref} rows={rows} {...props} className={`control control-area ${className}`} />;
  },
);

type ConEtiqueta = { etiqueta?: ReactNode } & React.InputHTMLAttributes<HTMLInputElement>;

export function Casilla({ etiqueta, className = '', ...props }: ConEtiqueta) {
  const caja = <input type="checkbox" {...props} className={`marca ${className}`} />;
  if (etiqueta === undefined) return caja;
  // La etiqueta envuelve al control: así el área pulsable incluye el texto, que en móvil
  // es la diferencia entre acertar y no acertar.
  return <label className="marca-linea">{caja}{etiqueta}</label>;
}

export function Opcion({ etiqueta, className = '', ...props }: ConEtiqueta) {
  const punto = <input type="radio" {...props} className={`marca ${className}`} />;
  if (etiqueta === undefined) return punto;
  return <label className="marca-linea">{punto}{etiqueta}</label>;
}

/**
 * Selector de fichero: el `<input type="file">` real queda oculto y visible solo para
 * lectores de pantalla; lo que se ve es la etiqueta. Es la única forma de tener un
 * disparador con estilo propio sin perder el teclado ni el anuncio del control.
 */
export function Fichero({ children, className = '', disabled, ...props }: { children: ReactNode } & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <label htmlFor={id} className={`control control-fichero ${disabled ? 'esta-deshabilitado' : ''} ${className}`}>
      {children}
      <input id={id} type="file" disabled={disabled} {...props} className="solo-lectores" />
    </label>
  );
}
