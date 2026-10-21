export const environment = {
  production: false,
  // ⚠️ TEMPORAL: Railway caído, back desplegado en Render con Gemini funcionando. Revertir cuando Railway vuelva.
  apiUrl: 'https://backend-intranet-tw.onrender.com',
  // Flag global para alternar entre mocks locales y back real.
  // Cambiar a false cuando se quiera probar contra el backend corriendo en apiUrl.
  usarMocks: false,
};
