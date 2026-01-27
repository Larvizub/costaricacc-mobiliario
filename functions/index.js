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

// Función para proxy a Skill API
exports.skill = functions.https.onRequest(async (req, res) => {
  // Manejo de CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  console.log('[skill] Nueva petición:', req.method, req.path, req.url, req.query);

  // Aceptar cualquier ruta que contenga 'events' (rewrite puede mantener prefijo)
  if (req.method === 'GET' && ((req.path && req.path.includes('events')) || (req.url && req.url.includes('/events')))) {
    // Buscar eventos
    try {
      // Obtener token de autenticación
      const tokenResponse = await fetch('https://grupoheroicaapi.skillsuite.net/app/wssuite/api/authenticate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'wsSk4Api',
          password: '5qT2Uu!qIjG%$XeD',
          companyAuthId: 'xudQREZBrfGdw0ag8tE3NR3XhM6LGa',
          companyId: ''
        })
      });

      if (!tokenResponse.ok) {
        throw new Error('Error obteniendo token');
      }

      const tokenData = await tokenResponse.json();
      if (!tokenData.success) {
        throw new Error('Autenticación fallida');
      }

      const token = tokenData.result.token;

      // Preparar body para GetEvents
      const { eventNumber, title } = req.query;
      const body = { Events: {} };
      if (eventNumber) body.Events.eventNumber = eventNumber; // Enviar como string
      if (title) body.Events.title = title;

      // Llamar a GetEvents
      const eventsResponse = await fetch('https://grupoheroicaapi.skillsuite.net/app/wssuite/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'idData': '14',
          'companyAuthId': 'xudQREZBrfGdw0ag8tE3NR3XhM6LGa'
        },
        body: JSON.stringify(body)
      });

      // Pasar al cliente el status y cuerpo de la respuesta de Skill para facilitar diagnóstico
      const respText = await eventsResponse.text();
      try {
        const parsed = JSON.parse(respText);
        return res.status(eventsResponse.status).json(parsed);
      } catch (e) {
        return res.status(eventsResponse.status).send(respText);
      }

    } catch (error) {
      console.error('[skill] Error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  } else {
    res.status(404).send('Not found');
  }
});
