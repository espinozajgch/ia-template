/**
 * Adaptador de disco. El de desarrollo: el sistema arranca entero sin credenciales de nube.
 */
import { mkdir, readFile, writeFile, unlink, readdir, stat } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { type Almacen, ErrorDeAlmacen } from './almacen';

export class AlmacenLocal implements Almacen {
  constructor(private raiz: string, private baseUrl = '/archivos') {}

  /** Una clave con `../` no puede salir de la raíz: es un recorrido de directorios. */
  private ruta(clave: string) {
    const destino = resolve(this.raiz, clave);
    const dentro = resolve(this.raiz);
    if (destino !== dentro && !destino.startsWith(dentro + sep)) {
      throw new ErrorDeAlmacen(`clave fuera de la raíz: ${clave}`, 'sin-permiso');
    }
    return destino;
  }
  private traducir(e: unknown, clave: string): never {
    const codigo = (e as NodeJS.ErrnoException)?.code;
    if (codigo === 'ENOENT') throw new ErrorDeAlmacen(`no existe: ${clave}`, 'no-existe', { cause: e });
    if (codigo === 'EACCES' || codigo === 'EPERM') throw new ErrorDeAlmacen(`sin permiso: ${clave}`, 'sin-permiso', { cause: e });
    throw new ErrorDeAlmacen(`fallo de almacenamiento en ${clave}`, 'desconocida', { cause: e });
  }

  async guardar(clave: string, contenido: Uint8Array | string) {
    const p = this.ruta(clave);
    try { await mkdir(dirname(p), { recursive: true }); await writeFile(p, contenido); }
    catch (e) { this.traducir(e, clave); }
  }
  async leer(clave: string) {
    try { return new Uint8Array(await readFile(this.ruta(clave))); } catch (e) { this.traducir(e, clave); }
  }
  async leerTexto(clave: string) { return new TextDecoder().decode(await this.leer(clave)); }
  async existe(clave: string) { try { await stat(this.ruta(clave)); return true; } catch { return false; } }
  async listar(prefijo = '') {
    const out: string[] = [];
    const rec = async (d: string) => {
      let e; try { e = await readdir(d, { withFileTypes: true }); } catch { return; }
      for (const x of e) {
        const p = join(d, x.name);
        if (x.isDirectory()) await rec(p);
        else { const k = relative(this.raiz, p).split(sep).join('/'); if (k.startsWith(prefijo)) out.push(k); }
      }
    };
    await rec(this.raiz);
    return out.sort();
  }
  async borrar(clave: string) {
    // Idempotente, igual que en los demás adaptadores: borrar lo que no está no es error.
    try { await unlink(this.ruta(clave)); }
    catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') this.traducir(e, clave); }
  }
  async enlaceTemporal(clave: string) {
    if (!await this.existe(clave)) throw new ErrorDeAlmacen(`no existe: ${clave}`, 'no-existe');
    // En local lo sirve la propia aplicación; en la nube sería una URL prefirmada.
    return `${this.baseUrl}/${clave}`;
  }
}
