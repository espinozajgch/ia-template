/**
 * Lo que se prueba aquí no es que los componentes pinten: es que el cableado de
 * accesibilidad **existe sin que nadie se acuerde de ponerlo**. Es la razón de ser del
 * pack, así que es lo que hay que gatear.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Envoltorio, Entrada, AreaTexto, Casilla, Opcion } from './campos';
import { Selector } from './selector';

describe('Envoltorio · la accesibilidad va sola', () => {
  it('asocia la etiqueta al control sin que nadie escriba un id', () => {
    render(<Envoltorio etiqueta="Nombre"><Entrada /></Envoltorio>);
    // Encontrarlo POR SU ETIQUETA es la prueba: si no estuviera asociada, esto falla.
    expect(screen.getByLabelText('Nombre')).toBeInstanceOf(HTMLInputElement);
  });

  it('respeta el id que ya traiga el control', () => {
    render(<Envoltorio etiqueta="Correo"><Entrada id="mio" /></Envoltorio>);
    expect(screen.getByLabelText('Correo')).toHaveAttribute('id', 'mio');
  });

  it('con error: marca el control como inválido y lo describe', () => {
    render(<Envoltorio etiqueta="Edad" error="Debe ser un número"><Entrada /></Envoltorio>);
    const control = screen.getByLabelText('Edad');
    expect(control).toHaveAttribute('aria-invalid', 'true');
    const descrito = control.getAttribute('aria-describedby');
    expect(descrito).toBeTruthy();
    expect(document.getElementById(descrito!)).toHaveTextContent('Debe ser un número');
  });

  it('el error se anuncia solo, sin que el usuario vaya a buscarlo', () => {
    render(<Envoltorio etiqueta="Edad" error="Debe ser un número"><Entrada /></Envoltorio>);
    expect(screen.getByRole('alert')).toHaveTextContent('Debe ser un número');
  });

  it('sin error, el control NO queda marcado como inválido', () => {
    render(<Envoltorio etiqueta="Edad"><Entrada /></Envoltorio>);
    expect(screen.getByLabelText('Edad')).not.toHaveAttribute('aria-invalid');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('la ayuda y el error se describen los DOS a la vez', () => {
    render(<Envoltorio etiqueta="Clave" ayuda="Mínimo 8 caracteres" error="Muy corta"><Entrada /></Envoltorio>);
    const ids = screen.getByLabelText('Clave').getAttribute('aria-describedby')!.split(' ');
    expect(ids).toHaveLength(2);
    const textos = ids.map(i => document.getElementById(i)?.textContent);
    expect(textos).toContain('Mínimo 8 caracteres');
    expect(textos).toContain('Muy corta');
  });

  it('el asterisco de obligatorio no lo lee el lector: lo comunica `required`', () => {
    render(<Envoltorio etiqueta="Nombre" obligatorio><Entrada required /></Envoltorio>);
    // El asterisco es decorativo; lo que informa es el atributo del control.
    expect(screen.getByLabelText(/Nombre/)).toBeRequired();
    expect(document.querySelector('.campo-obligatorio')).toHaveAttribute('aria-hidden', 'true');
  });

  it('funciona igual con área de texto', () => {
    render(<Envoltorio etiqueta="Notas" error="x"><AreaTexto /></Envoltorio>);
    expect(screen.getByLabelText('Notas')).toHaveAttribute('aria-invalid', 'true');
  });

  it('cada envoltorio genera ids propios: dos campos no colisionan', () => {
    render(<><Envoltorio etiqueta="Uno"><Entrada /></Envoltorio><Envoltorio etiqueta="Dos"><Entrada /></Envoltorio></>);
    expect(screen.getByLabelText('Uno').id).not.toBe(screen.getByLabelText('Dos').id);
  });
});

describe('Casilla y Opcion', () => {
  it('el texto forma parte del área pulsable', async () => {
    const u = userEvent.setup();
    render(<Casilla etiqueta="Acepto" />);
    await u.click(screen.getByText('Acepto'));
    expect(screen.getByRole('checkbox')).toBeChecked();
  });
  it('sin etiqueta devuelve el control desnudo, para componerlo aparte', () => {
    render(<Opcion name="x" />);
    expect(screen.getByRole('radio')).toBeInstanceOf(HTMLInputElement);
  });
});

describe('Selector · el patrón de combobox, entero', () => {
  const opciones = (
    <>
      <option value="a">Alfa</option>
      <option value="b">Beta</option>
      <option value="c">Gamma</option>
    </>
  );

  it('anuncia lo que es y en qué estado está', () => {
    render(<Selector aria-label="Letra">{opciones}</Selector>);
    const c = screen.getByRole('combobox');
    expect(c).toHaveAttribute('aria-expanded', 'false');
    expect(c).toHaveAttribute('aria-haspopup', 'listbox');
  });

  it('se abre y se recorre con el teclado', async () => {
    const u = userEvent.setup();
    render(<Selector aria-label="Letra">{opciones}</Selector>);
    const c = screen.getByRole('combobox');
    c.focus();
    await u.keyboard('{ArrowDown}');
    expect(c).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    await u.keyboard('{ArrowDown}');
    // aria-activedescendant es lo que le dice al lector dónde está el cursor.
    const activa = c.getAttribute('aria-activedescendant');
    expect(document.getElementById(activa!)).toHaveTextContent('Beta');
  });

  it('Enter elige y devuelve el foco al disparador', async () => {
    const u = userEvent.setup();
    const alCambiar = vi.fn();
    render(<Selector aria-label="Letra" onChange={alCambiar} name="letra">{opciones}</Selector>);
    const c = screen.getByRole('combobox');
    c.focus();
    await u.keyboard('{ArrowDown}{ArrowDown}{Enter}');
    expect(alCambiar).toHaveBeenCalledWith({ target: { value: 'b', name: 'letra' } });
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(c).toHaveFocus();   // sin esto, el foco se pierde y hay que tabular desde el principio
  });

  it('Escape cierra sin elegir', async () => {
    const u = userEvent.setup();
    const alCambiar = vi.fn();
    render(<Selector aria-label="Letra" onChange={alCambiar}>{opciones}</Selector>);
    screen.getByRole('combobox').focus();
    await u.keyboard('{ArrowDown}{ArrowDown}{Escape}');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(alCambiar).not.toHaveBeenCalled();
  });

  it('Inicio y Fin saltan a los extremos', async () => {
    const u = userEvent.setup();
    render(<Selector aria-label="Letra">{opciones}</Selector>);
    const c = screen.getByRole('combobox');
    c.focus();
    await u.keyboard('{ArrowDown}{End}');
    expect(document.getElementById(c.getAttribute('aria-activedescendant')!)).toHaveTextContent('Gamma');
    await u.keyboard('{Home}');
    expect(document.getElementById(c.getAttribute('aria-activedescendant')!)).toHaveTextContent('Alfa');
  });

  it('se busca tecleando, como en el nativo', async () => {
    const u = userEvent.setup();
    render(<Selector aria-label="Letra">{opciones}</Selector>);
    screen.getByRole('combobox').focus();
    await u.keyboard('g');
    const c = screen.getByRole('combobox');
    expect(document.getElementById(c.getAttribute('aria-activedescendant')!)).toHaveTextContent('Gamma');
  });

  it('marca cuál está elegida, que no es lo mismo que dónde está el cursor', async () => {
    const u = userEvent.setup();
    render(<Selector aria-label="Letra" value="c">{opciones}</Selector>);
    await u.click(screen.getByRole('combobox'));
    const elegida = screen.getAllByRole('option').find(o => o.getAttribute('aria-selected') === 'true');
    expect(elegida).toHaveTextContent('Gamma');
  });

  it('deshabilitado no se abre', async () => {
    const u = userEvent.setup();
    render(<Selector aria-label="Letra" disabled>{opciones}</Selector>);
    await u.click(screen.getByRole('combobox'));
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('dentro del Envoltorio hereda el cableado de error', () => {
    render(<Envoltorio etiqueta="Letra" error="Elige una"><Selector>{opciones}</Selector></Envoltorio>);
    const c = screen.getByRole('combobox');
    expect(c).toHaveAttribute('aria-invalid', 'true');
    expect(c).toHaveAttribute('aria-describedby');
  });

  /*
   * El cursor de teclado apuntando fuera de la lista.
   *
   * Los tres reventaban con «Cannot read properties of undefined (reading 'valor')». No es
   * un caso de laboratorio: una lista vacía es lo normal mientras carga o cuando depende de
   * otro campo, y encoger al filtrar es para lo que existe un combobox.
   *
   * Lo encontró el compilador —`noUncheckedIndexedAccess` sobre `opciones[activa]`— y estuvo
   * a punto de perderse entre veinte avisos de «falta el módulo vitest» de otros packs.
   */
  describe('el cursor nunca apunta fuera de la lista', () => {
    it('con la lista vacía, abrir y pulsar Enter no rompe', async () => {
      const u = userEvent.setup();
      const alCambiar = vi.fn();
      render(<Selector aria-label="Vacío" onChange={alCambiar}>{[]}</Selector>);
      const c = screen.getByRole('combobox');
      c.focus();
      await u.keyboard('{ArrowDown}');       // abre
      await u.keyboard('{Enter}');           // aquí estallaba
      expect(alCambiar).not.toHaveBeenCalled();
      // Y no se queda anunciando una opción que no existe.
      expect(c.getAttribute('aria-activedescendant')).toBeNull();
    });

    it('con la lista vacía, Inicio y Enter tampoco', async () => {
      const u = userEvent.setup();
      const alCambiar = vi.fn();
      render(<Selector aria-label="Vacío" onChange={alCambiar}>{[]}</Selector>);
      screen.getByRole('combobox').focus();
      await u.keyboard('{ArrowDown}{Home}{Enter}');
      expect(alCambiar).not.toHaveBeenCalled();
    });

    it('si la lista encoge con el desplegable abierto, el cursor no se queda fuera', async () => {
      const u = userEvent.setup();
      const alCambiar = vi.fn();
      const { rerender } = render(
        <Selector aria-label="Letra" onChange={alCambiar}>{opciones}</Selector>);
      screen.getByRole('combobox').focus();
      await u.keyboard('{ArrowDown}{End}');           // abierto, cursor en la última
      rerender(<Selector aria-label="Letra" onChange={alCambiar}><option value="a">Alfa</option></Selector>);
      await u.keyboard('{Enter}');                    // el cursor apuntaba a la tercera de una
      expect(alCambiar).not.toHaveBeenCalled();
    });

    it('y el camino normal sigue eligiendo', async () => {
      const u = userEvent.setup();
      const alCambiar = vi.fn();
      render(<Selector aria-label="Letra" onChange={alCambiar}>{opciones}</Selector>);
      screen.getByRole('combobox').focus();
      await u.keyboard('{ArrowDown}{ArrowDown}{Enter}');
      expect(alCambiar).toHaveBeenCalledWith(
        expect.objectContaining({ target: expect.objectContaining({ value: 'b' }) }));
    });
  });
});
