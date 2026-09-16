export const environment = {
  production: true,
  // Reemplaza con tu URL de Railway una vez que hagas deploy del backend
  apiBaseUrl: 'https://web-production-f9288.up.railway.app/api',
  // Key de navegador para Places Autocomplete (buscador de direcciones al asignar
  // chofer) -- distinta de la que usa el backend, restringida por dominio/referrer.
  // Sin esta key, el buscador simplemente no aparece (no rompe el resto del diálogo).
  googleMapsBrowserApiKey: 'AIzaSyD8K1ZUN0jh84rvYSEpQReMZfR8PK-RsFA',
};
