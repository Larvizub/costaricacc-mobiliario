// Firebase Functions backend para envío de correos con Microsoft Graph API (Generación 1)
const functions = require('firebase-functions/v1');
const fetch = require('node-fetch');

// Configuración de Microsoft Graph (variables de entorno en Firebase)
const MICROSOFT_CLIENT_ID = functions.config().microsoft.client_id;
const MICROSOFT_CLIENT_SECRET = functions.config().microsoft.client_secret;
const MICROSOFT_TENANT_ID = functions.config().microsoft.tenant_id;

// Obtener token de aplicación para Graph API
async function getAppAccessToken() {
  const url = `https://login.microsoftonline.com/${MICROSOFT_TENANT_ID}/oauth2/v2.0/token`;
  const params = new URLSearchParams();
  params.append('client_id', MICROSOFT_CLIENT_ID);
  params.append('client_secret', MICROSOFT_CLIENT_SECRET);
  params.append('scope', 'https://graph.microsoft.com/.default');
  params.append('grant_type', 'client_credentials');
  console.log('[getAppAccessToken] URL:', url);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error('[getAppAccessToken] Error:', res.status, errText);
    throw new Error('No se pudo obtener el token de Microsoft Graph');
  }
  const data = await res.json();
  console.log('[getAppAccessToken] Token obtenido');
  return data.access_token;
}

// Función HTTPS para enviar correo (Generación 1)
exports.sendMailGraph = functions.https.onRequest(async (req, res) => {
  // --- CORS ---
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  // --- FIN CORS ---
  console.log('[sendMailGraph] Nueva petición:', req.method, req.body);
  if (req.method !== 'POST') {
    console.warn('[sendMailGraph] Método no permitido:', req.method);
    return res.status(405).send('Método no permitido');
  }
  const { toEmails, subject, html } = req.body;
  if (!toEmails || !subject || !html) {
    console.warn('[sendMailGraph] Faltan parámetros:', req.body);
    return res.status(400).send('Faltan parámetros');
  }
  try {
    const accessToken = await getAppAccessToken();
    const endpoint = 'https://graph.microsoft.com/v1.0/users/' + functions.config().microsoft.sender + '/sendMail';
    const body = {
      message: {
        subject,
        body: { contentType: 'HTML', content: html },
        toRecipients: toEmails.map(email => ({ emailAddress: { address: email } }))
      },
      saveToSentItems: true
    };
    console.log('[sendMailGraph] Enviando a Graph:', endpoint, body);
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      const error = await response.text();
      console.error('[sendMailGraph] Error Graph:', response.status, error);
      return res.status(500).send('Error enviando correo: ' + error);
    }
    console.log('[sendMailGraph] Correo enviado correctamente');
    return res.status(200).send('Correo enviado correctamente');
  } catch (e) {
    console.error('[sendMailGraph] Error interno:', e);
    return res.status(500).send('Error interno: ' + e.message);
  }
});
