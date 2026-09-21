// Este script se ejecuta antes de ng build en Railway.
// Lee la variable de entorno API_URL y la escribe en environment.prod.ts

const fs = require('fs');
const path = require('path');

const apiUrl = process.env.API_URL;

if (!apiUrl) {
  console.warn('[set-env] ADVERTENCIA: API_URL no está definida. Se usará placeholder.');
}

const contenido = `export const environment = {
  production: true,
  apiUrl: '${apiUrl || 'API_URL_PLACEHOLDER'}'
};
`;

const destino = path.join(__dirname, '..', 'src', 'environments', 'environment.prod.ts');
fs.writeFileSync(destino, contenido, 'utf8');
console.log(`[set-env] environment.prod.ts actualizado → apiUrl: ${apiUrl || 'API_URL_PLACEHOLDER'}`);
