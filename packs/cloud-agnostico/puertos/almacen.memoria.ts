/**
 * Adaptador en memoria. Es el que usan los tests: instantáneo, determinista y sin red.
 *
 * Que exista es la mitad del valor de haber definido el puerto — probar la lógica de
 * negocio deja de necesitar infraestructura.
 */
import { type Almacen, ErrorDeAlmacen } from './almacen';

export class AlmacenEnMemoria implements Almacen {
  private datos = new Map<string, Uint8Array>();

  async guardar(clave: string, contenido: Uint8Array | string) {
    this.datos.set(clave, typeof contenido === 'string' ? new TextEncoder().encode(contenido) : contenido);
  }
  async leer(clave: string) {
    const v = this.datos.get(clave);
    if (!v) throw new ErrorDeAlmacen(`no existe: ${clave}`, 'no-existe');
    return v;
  }
  async leerTexto(clave: string) { return new TextDecoder().decode(await this.leer(clave)); }
  async existe(clave: string)    { return this.datos.has(clave); }
  async listar(prefijo = '')     { return [...this.datos.keys()].filter(k => k.startsWith(prefijo)).sort(); }
  async borrar(clave: string) {
    // Borrar lo que no está NO es un error: hace el borrado idempotente, y así el
    // reintento de una limpieza no falla a la mitad.
    this.datos.delete(clave);
  }
  async enlaceTemporal(clave: string) {
    if (!await this.existe(clave)) throw new ErrorDeAlmacen(`no existe: ${clave}`, 'no-existe');
    return `memoria://${clave}`;
  }

  /** Solo para los tests. No forma parte del puerto. */
  limpiar() { this.datos.clear(); }
}
