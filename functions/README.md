# Firebase Functions (Generación 1)

Este directorio contiene el backend para el envío de correos mediante Microsoft Graph API usando Cloud Functions para Firebase (Gen 1).

## Estructura
- `index.js`: Código principal de la función HTTPS para enviar correos.
- `package.json`: Dependencias y scripts para despliegue.
- `.eslintrc.js`: Reglas de linting.
- `.gitignore`: Exclusiones para control de versiones.

## Variables de entorno necesarias
Configura en Firebase:
- `microsoft.client_id`
- `microsoft.client_secret`
- `microsoft.tenant_id`
- `microsoft.sender` (correo del remitente autorizado)

## Despliegue
1. Instala dependencias:
   ```bash
   cd functions
   npm install
   ```
2. Configura las variables de entorno:
   ```bash
   firebase functions:config:set microsoft.client_id="TU_CLIENT_ID" microsoft.client_secret="TU_SECRET" microsoft.tenant_id="TU_TENANT" microsoft.sender="remitente@dominio.com"
   ```
3. Despliega:
   ```bash
   firebase deploy --only functions
   ```
