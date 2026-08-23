/**
 * El único fichero que hay que ajustar para adaptar la suite a este proyecto.
 * Rutas, roles y selectores, en un sitio.
 */
export const RUTAS = [
  { path: '/',          nombre: 'inicio',  titulo: /inicio|bienvenid/i },
  { path: '/login',     nombre: 'acceso',  titulo: /acceder|iniciar sesión/i },
  { path: '/dashboard', nombre: 'panel',   titulo: /panel|resumen/i, requiereSesion: true },
] as const;

/** Lo que cada rol debe ver, y lo que NO debe poder alcanzar. */
export const ROLES = [
  { rol: 'lector', ve: ['/dashboard'],              noAlcanza: ['/admin', '/configuracion'] },
  { rol: 'admin',  ve: ['/dashboard', '/admin'],    noAlcanza: [] },
] as const;

/** Selectores estables. Preferir roles de accesibilidad a clases CSS: no se rompen al maquetar. */
export const SEL = {
  bannerError: '[role="alert"]',
  cargando:    '[aria-busy="true"], [role="status"]',
  navPrincipal:'nav',
  botonEnviar: 'button[type="submit"]',
};

/** Sesión falsa para las rutas que la requieren. Ajustar a cómo la guarda la aplicación. */
export const SESION = { clave: 'token', valor: 'token-de-prueba' };
