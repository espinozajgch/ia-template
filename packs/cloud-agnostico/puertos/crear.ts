/**
 * La FACTORÍA: el único sitio del código que sabe qué implementaciones existen.
 *
 * Un `if (entorno === 'produccion')` repartido por el código es el mismo acoplamiento con
 * más pasos. Aquí está una vez, y la aplicación solo ve el tipo `Almacen`.
 */
import type { Almacen } from './almacen';
import { AlmacenLocal } from './almacen.local';
import { AlmacenEnMemoria } from './almacen.memoria';

export type Proveedor = 'local' | 'memoria' | 's3';

export function crearAlmacen(proveedor: Proveedor = (process.env.ALMACEN as Proveedor) ?? 'local'): Almacen {
  switch (proveedor) {
    case 'memoria': return new AlmacenEnMemoria();
    case 'local':   return new AlmacenLocal(process.env.ALMACEN_RAIZ ?? './datos');
    case 's3':
      // El adaptador de S3 vive aparte y se importa de forma perezosa, para que el SDK
      // del proveedor no entre en el paquete de quien no lo usa.
      throw new Error('adaptador s3 no incluido: escríbelo implementando Almacen y añádelo aquí');
    default: {
      // Si mañana se añade un proveedor y falta su rama, esto no compila. Es a propósito.
      const _exhaustivo: never = proveedor;
      throw new Error(`proveedor desconocido: ${_exhaustivo}`);
    }
  }
}
