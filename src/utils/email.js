import { db } from "../firebase";
import { ref, get } from "firebase/database";
// Utilidad para enviar correos con Microsoft Graph API
// Requiere autenticación previa del usuario con permisos de enviar correos (Mail.Send)

/**
 * Envía un correo usando Microsoft Graph API.
 * @param {Object} params
 * @param {string[]} params.toEmails - Correos destino
 * @param {string} params.subject - Asunto
 * @param {string} params.html - Cuerpo HTML
 * @param {string} params.accessToken - Token de acceso OAuth2 válido con permiso Mail.Send
 * @returns {Promise<Response>}
 */
// Llama al backend de Firebase Functions para enviar el correo
export async function sendMailGraph({ toEmails, subject, html }) {
  // Cambia la URL por la de tu función desplegada en Firebase
  const endpoint =
    import.meta.env.VITE_FIREBASE_FUNCTIONS_URL_SENDMAIL ||
    'https://us-central1-costaricacc-mobiliario.cloudfunctions.net/sendMailGraph';
  console.log('[sendMailGraph] Llamando a:', endpoint, { toEmails, subject, html });
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ toEmails, subject, html })
  });
  const text = await res.text();
  console.log('[sendMailGraph] Respuesta:', res.status, text);
  if (!res.ok) {
    throw new Error(`Error enviando correo: ${res.status} - ${text}`);
  }
  return res;
}

// Plantilla para notificación de nueva solicitud


export function getSolicitudHtml({ solicitud, logoUrlHeroica, logoUrlCCCR }) {
  return `
    <div style="font-family: 'Segoe UI', 'Montserrat', 'Poppins', Arial, sans-serif; background: #f7fafc; padding: 0; border-radius: 18px; max-width: 650px; margin: auto; box-shadow: 0 4px 24px #0001;">
      <div style="background: #fff; border-radius: 18px 18px 0 0; padding: 32px 32px 18px 32px; text-align: center; border-bottom: 1px solid #e0e0e0;">
        <img src="${logoUrlCCCR}" alt="CCCR" style="height: 64px; margin-bottom: 12px;" />
      </div>
      <div style="padding: 24px 32px 8px 32px;">
        <h2 style="color: #00830e; font-weight: 800; margin-bottom: 12px; letter-spacing: 1px; text-align:center;">Nueva Solicitud de Mobiliario</h2>
        <div style="background: #fff; border-radius: 12px; padding: 20px 24px; margin-bottom: 18px; box-shadow: 0 2px 8px #0001;">
          <table style="width:100%; font-size: 1.05em; border-collapse: collapse;">
            <tr><td style="font-weight:600; padding: 6px 0;">Evento:</td><td>${solicitud.evento}</td></tr>
            <tr><td style="font-weight:600; padding: 6px 0;">Solicitante:</td><td>${solicitud.solicitanteNombre || solicitud.solicitante}</td></tr>
            <tr><td style="font-weight:600; padding: 6px 0;">Fechas:</td><td>${solicitud.fechaInicio} ${solicitud.horaInicio} - ${solicitud.fechaFin} ${solicitud.horaFin}</td></tr>
            <tr><td style="font-weight:600; padding: 6px 0;">Persona a quien se entrega:</td><td>${solicitud.entrega || '-'}</td></tr>
            <tr><td style="font-weight:600; padding: 6px 0;">Observaciones:</td><td>${solicitud.observaciones || '-'}</td></tr>
          </table>
          <div style="margin-top: 18px;">
            <span style="font-weight:600; color:#00830e;">Mobiliario solicitado:</span>
            <ul style="margin: 8px 0 0 18px; padding:0;">
              ${(solicitud.detalle || []).map(item => `
                <li style="margin-bottom:4px;">Artículo: <b>${item.nombre || item.articulo}</b> | Cantidad: <b>${item.cantidad}</b></li>
              `).join('')}
            </ul>
          </div>
        </div>
      </div>
      <div style="background: #fff; border-radius: 0 0 18px 18px; padding: 18px 32px 24px 32px; text-align: center; border-top: 1px solid #e0e0e0;">
        <img src="${logoUrlHeroica}" alt="Heroica" style="height: 40px; margin-top: 8px; opacity: 0.85;" />
        <div style="margin-top: 18px;">
          <span style="font-size: 0.95em; color: #888;">Este correo fue generado automáticamente por el sistema de gestión de mobiliario.<br>Por favor, no responder a este mensaje.</span>
        </div>
      </div>
    </div>
  `;
}

// Plantilla para notificación de cambio de estatus


export function getStatusHtml({ solicitud, status, logoUrlHeroica, logoUrlCCCR }) {
  let color = '#00830e';
  let statusText = status;
  if (status === 'aprobada' || status === 'autorizada') { color = '#43a047'; statusText = 'Aprobada'; }
  if (status === 'rechazada' || status === 'rechazado') { color = '#e53935'; statusText = 'Rechazada'; }
  if (status === 'pendiente') { color = '#fbc02d'; statusText = 'Pendiente'; }
  return `
    <div style="font-family: 'Segoe UI', 'Montserrat', 'Poppins', Arial, sans-serif; background: #f7fafc; padding: 0; border-radius: 18px; max-width: 650px; margin: auto; box-shadow: 0 4px 24px #0001;">
      <div style="background: #fff; border-radius: 18px 18px 0 0; padding: 32px 32px 18px 32px; text-align: center; border-bottom: 1px solid #e0e0e0;">
        <img src="${logoUrlCCCR}" alt="CCCR" style="height: 64px; margin-bottom: 12px;" />
      </div>
      <div style="padding: 24px 32px 8px 32px;">
        <h2 style="color: ${color}; font-weight: 800; margin-bottom: 12px; letter-spacing: 1px; text-align:center;">Actualización de Solicitud</h2>
        <div style="background: #fff; border-radius: 12px; padding: 20px 24px; margin-bottom: 18px; box-shadow: 0 2px 8px #0001;">
          <table style="width:100%; font-size: 1.05em; border-collapse: collapse;">
            <tr><td style="font-weight:600; padding: 6px 0;">Evento:</td><td>${solicitud.evento}</td></tr>
            <tr><td style="font-weight:600; padding: 6px 0;">Solicitante:</td><td>${solicitud.solicitanteNombre || solicitud.solicitante}</td></tr>
            <tr><td style="font-weight:600; padding: 6px 0;">Fechas:</td><td>${solicitud.fechaInicio} ${solicitud.horaInicio} - ${solicitud.fechaFin} ${solicitud.horaFin}</td></tr>
          </table>
          <div style="margin-top: 18px;">
            <span style="font-weight:600; color:${color};">Estado actualizado:</span>
            <span style="display:inline-block; margin-left:8px; font-weight:700; color:#fff; background:${color}; border-radius:8px; padding:4px 16px;">${statusText}</span>
          </div>
        </div>
      </div>
      <div style="background: #fff; border-radius: 0 0 18px 18px; padding: 18px 32px 24px 32px; text-align: center; border-top: 1px solid #e0e0e0;">
        <img src="${logoUrlHeroica}" alt="Heroica" style="height: 40px; margin-top: 8px; opacity: 0.85;" />
        <div style="margin-top: 18px;">
          <span style="font-size: 0.95em; color: #888;">Este correo fue generado automáticamente por el sistema de gestión de mobiliario.<br>Por favor, no responder a este mensaje.</span>
        </div>
      </div>
    </div>
  `;
}

// Notificación de solicitud de reparación para Áreas
// Reemplaza emails ficticios con el pool configurado en la base de datos
export async function sendSolicitudReparacionEmail(userEmail) {
  console.log('[email] sendSolicitudReparacionEmail invoked with userEmail:', userEmail);
  // Leer pool de correos de nuevas solicitudes
  console.log('[email] Leyendo pool de correos de solicitudes desde Firebase');
  const snap = await get(ref(db, 'notificaciones/correosSolicitudes'));
  const pool = snap.val() || [];
  const baseEmails = Array.isArray(pool) ? pool : Object.values(pool);
  const toEmails = [...baseEmails, userEmail];
  const subject = 'Nueva solicitud de revisión de reparación';
  const logoUrl = `${window.location.origin}/logo.png`;
  const html = `
    <table width="100%" style="font-family:Arial,sans-serif;background-color:#f4f4f4;padding:20px;">
      <tr><td align="center"><img src="${logoUrl}" alt="Logo" style="max-width:150px;"/></td></tr>
      <tr><td style="background-color:#ffffff;padding:20px;border-radius:8px;">
        <h2 style="color:#333;">Nueva Solicitud de Reparación</h2>
        <p>El usuario <strong>${userEmail}</strong> ha solicitado una revisión de mobiliario.</p>
        <p style="text-align:center;margin:30px 0;"><a href="${window.location.origin}/reparaciones" style="display:inline-block;padding:12px 24px;background-color:#00830e;color:#ffffff;text-decoration:none;border-radius:4px;font-weight:bold;">Ver Reparaciones</a></p>
      </td></tr>
      <tr><td align="center" style="font-size:12px;color:#888;padding-top:10px;">© 2025 Tu Empresa. Todos los derechos reservados.</td></tr>
    </table>
  `;
  console.log('[email] Enviando correo de solicitud de reparación a:', toEmails);
  try {
    const res = await sendMailGraph({ toEmails, subject, html });
    console.log('[email] Correo de solicitud de reparación enviado correctamente');
    return res;
  } catch (error) {
    console.error('[email] Error enviando correo de solicitud de reparación:', error);
    throw error;
  }
}

// Notificación de entrega pendiente para Infraestructura
// Reemplaza emails ficticios con el pool configurado en la base de datos
export async function sendEntregaActivosEmail() {
  console.log('[email] sendEntregaActivosEmail invoked');
  // Leer pool de correos de Áreas y Montajes
  console.log('[email] Leyendo pool de correos de Áreas y Montajes desde Firebase');
  const snap = await get(ref(db, 'notificaciones/correosAreasMontajes'));
  const pool = snap.val() || [];
  const toEmails = Array.isArray(pool) ? pool : Object.values(pool);
  const subject = 'Entrega de Activos Pendiente';
  const logoUrl = `${window.location.origin}/logo.png`;
  const html = `
    <table width="100%" style="font-family:Arial,sans-serif;background-color:#f4f4f4;padding:20px;">
      <tr><td align="center"><img src="${logoUrl}" alt="Logo" style="max-width:150px;"/></td></tr>
      <tr><td style="background-color:#ffffff;padding:20px;border-radius:8px;">
        <h2 style="color:#333;">Entrega de Activos Pendiente</h2>
        <p>Se ha generado una entrega de activos pendiente de aprobación.</p>
        <p style="text-align:center;margin:30px 0;"><a href="${window.location.origin}/entrega-activos" style="display:inline-block;padding:12px 24px;background-color:#00830e;color:#ffffff;text-decoration:none;border-radius:4px;font-weight:bold;">Ver Entrega de Activos</a></p>
      </td></tr>
      <tr><td align="center" style="font-size:12px;color:#888;padding-top:10px;">© 2025 Tu Empresa. Todos los derechos reservados.</td></tr>
    </table>
  `;
  console.log('[email] Enviando correo de entrega de activos a:', toEmails);
  try {
    const res = await sendMailGraph({ toEmails, subject, html });
    console.log('[email] Correo de entrega de activos enviado correctamente');
    return res;
  } catch (error) {
    console.error('[email] Error enviando correo de entrega de activos:', error);
    throw error;
  }
}
