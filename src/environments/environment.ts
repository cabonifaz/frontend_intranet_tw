export const environment = {
  production: false,
  // Backend de staging en Railway: el mismo que usa la app móvil.
  // Antes (temporal, cuando Railway estaba caído): 'https://backend-intranet-tw.onrender.com' (Render, con Gemini funcionando).
  apiUrl: 'https://backendintranettw-staging.up.railway.app',
  // Flag global para alternar entre mocks locales y back real.
  // Cambiar a false cuando se quiera probar contra el backend corriendo en apiUrl.
  usarMocks: false,
};
