/**
 * El PUERTO de almacenamiento.
 *
 * Se define por lo que la aplicación necesita —guardar, leer, listar, borrar— no por lo
 * que ofrece ningún proveedor. Si aquí apareciera `putObjectWithServerSideEncryption`,
 * esto no sería un puerto: sería S3 con otro nombre.
 */

/** Error del DOMINIO. Ningún error del proveedor cruza esta frontera. */
export class ErrorDeAlmacen extends Error {
  constructor(
    message: string,
    readonly causa: 'no-existe' | 'sin-permiso' | 'ya-existe' | 'indisponible' | 'desconocida',
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = 'ErrorDeAlmacen';
  }
}

export interface Almacen {
  guardar(clave: string, contenido: Uint8Array | string, tipo?: string): Promise<void>;
  leer(clave: string): Promise<Uint8Array>;
  leerTexto(clave: string): Promise<string>;
  existe(clave: string): Promise<boolean>;
  listar(prefijo?: string): Promise<string[]>;
  borrar(clave: string): Promise<void>;
  /**
   * Un enlace temporal para que el cliente descargue sin pasar por el servidor.
   * En local se sirve por la propia aplicación; en la nube es una URL prefirmada.
   * Está en el puerto porque la aplicación lo NECESITA, y cada adaptador lo resuelve
   * a su manera.
   */
  enlaceTemporal(clave: string, segundos: number): Promise<string>;
}
