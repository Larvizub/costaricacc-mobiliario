// Firebase Functions backend para envío de correos con Microsoft Graph API (Generación 1)
const functions = require('firebase-functions/v1');
const fetch = require('node-fetch');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

const realtimeDb = admin.database();

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

function normalizeText(value) {
  return (value || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function asArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return Object.values(value);
}

function formatDateAsKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function addBusinessDays(date, businessDays) {
  const result = new Date(date);
  let added = 0;
  while (added < businessDays) {
    result.setDate(result.getDate() + 1);
    if (!isWeekend(result)) {
      added += 1;
    }
  }
  return result;
}

function buildReminderHtml({ tipoPool, solicitud, inventarioById }) {
  const evento = solicitud?.evento || '-';
  const fechaInicio = solicitud?.fechaInicio || '-';
  const horaInicio = solicitud?.horaInicio || '-';
  const fechaFin = solicitud?.fechaFin || '-';
  const horaFin = solicitud?.horaFin || '-';
  const entrega = solicitud?.entrega || '-';
  const descripcion = solicitud?.observaciones || '-';
  const detalle = Array.isArray(solicitud?.detalle) ? solicitud.detalle : [];

  const detalleRows = detalle.length > 0
    ? detalle.map((item) => {
      const nombreArticulo = item?.nombre || inventarioById?.[item?.articulo]?.nombre || item?.articulo || '-';
      const cantidad = item?.cantidad ?? '-';
      const descripcionItem = item?.observaciones || item?.descripcion || '-';
      return `
        <tr>
          <td style="padding: 8px; border: 1px solid #e5e7eb;">${nombreArticulo}</td>
          <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">${cantidad}</td>
          <td style="padding: 8px; border: 1px solid #e5e7eb;">${descripcionItem}</td>
        </tr>
      `;
    }).join('')
    : `
      <tr>
        <td colspan="3" style="padding: 8px; border: 1px solid #e5e7eb; text-align: center; color: #6b7280;">Sin ítems registrados</td>
      </tr>
    `;

  return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; background: #f7fafc; padding: 20px;">
      <div style="max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb; overflow: hidden;">
        <div style="background: #00830e; color: #ffffff; padding: 16px 20px; font-weight: 700; font-size: 18px;">
          Recordatorio de reserva (${tipoPool})
        </div>
        <div style="padding: 20px; color: #1f2937;">
          <p style="margin: 0 0 12px 0;">Este es un recordatorio automático. La siguiente reserva inicia en 6 días hábiles:</p>
          <table style="width:100%; border-collapse: collapse;">
            <tr><td style="padding: 6px 0; font-weight: 600;">Evento:</td><td>${evento}</td></tr>
            <tr><td style="padding: 6px 0; font-weight: 600;">Inicio:</td><td>${fechaInicio} ${horaInicio}</td></tr>
            <tr><td style="padding: 6px 0; font-weight: 600;">Fin:</td><td>${fechaFin} ${horaFin}</td></tr>
            <tr><td style="padding: 6px 0; font-weight: 600;">Entrega a:</td><td>${entrega}</td></tr>
            <tr><td style="padding: 6px 0; font-weight: 600;">Descripción:</td><td>${descripcion}</td></tr>
          </table>
          <div style="margin-top: 16px;">
            <div style="font-weight: 600; margin-bottom: 8px;">Ítems en reserva</div>
            <table style="width:100%; border-collapse: collapse; font-size: 14px;">
              <thead>
                <tr style="background: #f3f4f6;">
                  <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">Ítem</th>
                  <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">Cantidad</th>
                  <th style="padding: 8px; border: 1px solid #e5e7eb; text-align: left;">Descripción</th>
                </tr>
              </thead>
              <tbody>
                ${detalleRows}
              </tbody>
            </table>
          </div>
          <p style="margin: 16px 0 0 0; color: #6b7280; font-size: 12px;">
            Correo generado automáticamente por el sistema de gestión de mobiliario.
          </p>
        </div>
      </div>
    </div>
  `;
}

async function sendGraphMailFromServer({ toEmails, subject, html }) {
  const uniqueRecipients = [...new Set((toEmails || []).filter(Boolean))];
  if (uniqueRecipients.length === 0) return;

  const accessToken = await getAppAccessToken();
  const endpoint = `https://graph.microsoft.com/v1.0/users/${functions.config().microsoft.sender}/sendMail`;
  const body = {
    message: {
      subject,
      body: { contentType: 'HTML', content: html },
      toRecipients: uniqueRecipients.map((email) => ({ emailAddress: { address: email } }))
    },
    saveToSentItems: true
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error enviando correo de recordatorio: ${response.status} - ${errorText}`);
  }
}

function getPoolsForSolicitud({ solicitud, inventarioById, categoriasById, notificaciones }) {
  const categoriasSolicitud = new Set();
  const detalle = Array.isArray(solicitud?.detalle) ? solicitud.detalle : [];

  for (const item of detalle) {
    const articuloId = item?.articulo;
    if (!articuloId) continue;
    const articulo = inventarioById[articuloId] || {};
    const categoriaId = articulo?.categoria;
    const categoriaNombre = categoriasById[categoriaId]?.nombre || categoriaId;
    const categoriaNormalizada = normalizeText(categoriaNombre);
    if (categoriaNormalizada) categoriasSolicitud.add(categoriaNormalizada);
  }

  const tieneInfraestructura = [...categoriasSolicitud].some((nombre) => nombre === 'infraestructura');
  const tieneMobiliario = categoriasSolicitud.size === 0 || [...categoriasSolicitud].some((nombre) => nombre !== 'infraestructura');

  const correosInfraestructura = asArray(notificaciones?.correosInfraestructura);
  const correosMobiliario = asArray(notificaciones?.correosAreasMontajes).length > 0
    ? asArray(notificaciones?.correosAreasMontajes)
    : asArray(notificaciones?.correosSolicitudes);

  return {
    tieneInfraestructura,
    tieneMobiliario,
    correosInfraestructura,
    correosMobiliario
  };
}

const estadosNoBloqueantes = new Set([
  'rechazada',
  'rechazado',
  'cancelada',
  'cancelado',
  'eliminada',
  'eliminado',
  'completada',
  'completado'
]);

const sendReservaRemindersSixBusinessDaysBeforeHandler = functions.pubsub
  .schedule('0 7 * * *')
  .timeZone('America/Costa_Rica')
  .onRun(async () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    if (isWeekend(now)) {
      console.log('[sendReservaRemindersOneWeekBefore] Hoy es fin de semana, no se envían recordatorios.');
      return null;
    }

    const targetDate = addBusinessDays(now, 6);
    const targetDateKey = formatDateAsKey(targetDate);

    const [solicitudesSnap, inventarioSnap, categoriasSnap, notificacionesSnap] = await Promise.all([
      realtimeDb.ref('solicitudes').once('value'),
      realtimeDb.ref('inventario').once('value'),
      realtimeDb.ref('categorias').once('value'),
      realtimeDb.ref('notificaciones').once('value')
    ]);

    const solicitudes = solicitudesSnap.val() || {};
    const inventarioById = inventarioSnap.val() || {};
    const categoriasById = categoriasSnap.val() || {};
    const notificaciones = notificacionesSnap.val() || {};

    let remindersSent = 0;

    for (const [solicitudId, solicitud] of Object.entries(solicitudes)) {
      const estado = normalizeText(solicitud?.estado || 'pendiente');
      if (estadosNoBloqueantes.has(estado)) continue;

      const fechaInicioSolicitud = (solicitud?.fechaInicio || '').toString().slice(0, 10);
      if (fechaInicioSolicitud !== targetDateKey) continue;

      const pools = getPoolsForSolicitud({ solicitud, inventarioById, categoriasById, notificaciones });
      const updates = {};
      const recordatoriosSeisHabiles = solicitud?.recordatorios?.seisDiasHabiles || {};

      if (pools.tieneMobiliario && !recordatoriosSeisHabiles?.mobiliario?.enviadoAt && pools.correosMobiliario.length > 0) {
        const asunto = `Recordatorio: reserva de mobiliario en 6 días hábiles${solicitud?.evento ? ` - ${solicitud.evento}` : ''}`;
        const html = buildReminderHtml({ tipoPool: 'Mobiliario', solicitud, inventarioById });
        await sendGraphMailFromServer({
          toEmails: pools.correosMobiliario,
          subject: asunto,
          html
        });
        updates['recordatorios/seisDiasHabiles/mobiliario'] = {
          enviadoAt: Date.now(),
          destinatarios: [...new Set(pools.correosMobiliario)]
        };
        remindersSent += 1;
      }

      if (pools.tieneInfraestructura && !recordatoriosSeisHabiles?.infraestructura?.enviadoAt && pools.correosInfraestructura.length > 0) {
        const asunto = `Recordatorio: reserva de infraestructura en 6 días hábiles${solicitud?.evento ? ` - ${solicitud.evento}` : ''}`;
        const html = buildReminderHtml({ tipoPool: 'Infraestructura', solicitud, inventarioById });
        await sendGraphMailFromServer({
          toEmails: pools.correosInfraestructura,
          subject: asunto,
          html
        });
        updates['recordatorios/seisDiasHabiles/infraestructura'] = {
          enviadoAt: Date.now(),
          destinatarios: [...new Set(pools.correosInfraestructura)]
        };
        remindersSent += 1;
      }

      if (Object.keys(updates).length > 0) {
        await realtimeDb.ref(`solicitudes/${solicitudId}`).update(updates);
      }
    }

    console.log(`[sendReservaRemindersOneWeekBefore] Recordatorios enviados: ${remindersSent}. Fecha objetivo (6 días hábiles): ${targetDateKey}`);
    return null;
  });

exports.sendReservaRemindersSixBusinessDaysBefore = sendReservaRemindersSixBusinessDaysBeforeHandler;
exports.sendReservaRemindersOneWeekBefore = sendReservaRemindersSixBusinessDaysBeforeHandler;

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
