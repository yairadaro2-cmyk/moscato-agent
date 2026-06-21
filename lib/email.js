import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// ─────────────────────────────────────────────
// EMAIL — Notificación de turno al equipo
// ─────────────────────────────────────────────

export async function registrarTurno(datos) {
  const { nombre, telefono, auto, servicio, sucursal, dia_preferido, notas } = datos;

  const ahora = new Date().toLocaleString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    dateStyle: 'full',
    timeStyle: 'short'
  });

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; }
    .card { background: white; border-radius: 8px; padding: 24px; max-width: 500px; margin: 0 auto; }
    .header { background: #1a1a2e; color: white; border-radius: 6px; padding: 16px; text-align: center; margin-bottom: 20px; }
    .header h1 { margin: 0; font-size: 20px; }
    .header p { margin: 4px 0 0; font-size: 13px; opacity: 0.8; }
    .row { display: flex; gap: 8px; margin-bottom: 12px; }
    .label { font-size: 12px; color: #666; font-weight: bold; text-transform: uppercase; min-width: 120px; padding-top: 2px; }
    .value { font-size: 15px; color: #111; }
    .sucursal-badge { display: inline-block; background: #e0f2fe; color: #0369a1; padding: 4px 12px; border-radius: 20px; font-size: 14px; font-weight: bold; }
    .footer { margin-top: 20px; font-size: 12px; color: #999; text-align: center; }
    hr { border: none; border-top: 1px solid #eee; margin: 16px 0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>🔔 Nuevo turno solicitado</h1>
      <p>Moscato Neumáticos · ${ahora}</p>
    </div>

    <div class="row">
      <span class="label">👤 Cliente</span>
      <span class="value">${nombre}</span>
    </div>
    <div class="row">
      <span class="label">📱 Teléfono</span>
      <span class="value"><a href="https://wa.me/549${telefono.replace(/\D/g, '')}">${telefono}</a></span>
    </div>
    <div class="row">
      <span class="label">🚗 Auto</span>
      <span class="value">${auto}</span>
    </div>

    <hr/>

    <div class="row">
      <span class="label">🔧 Servicio</span>
      <span class="value">${servicio}</span>
    </div>
    <div class="row">
      <span class="label">📍 Sucursal</span>
      <span class="value"><span class="sucursal-badge">${sucursal}</span></span>
    </div>
    <div class="row">
      <span class="label">📅 Día preferido</span>
      <span class="value">${dia_preferido}</span>
    </div>

    ${notas ? `
    <hr/>
    <div class="row">
      <span class="label">📝 Notas</span>
      <span class="value">${notas}</span>
    </div>
    ` : ''}

    <div class="footer">
      Solicitud enviada por el asistente virtual de WhatsApp · Moscato Neumáticos
    </div>
  </div>
</body>
</html>
  `.trim();

  try {
    await resend.emails.send({
      from: 'Asistente Moscato <turnos@moscatoneumaticos.com.ar>',
      to: process.env.NOTIFICATION_EMAIL,
      subject: `⚙️ Turno: ${nombre} — ${servicio} — Sucursal ${sucursal}`,
      html
    });

    return {
      success: true,
      message: 'Turno registrado. El equipo va a contactar al cliente para confirmar.'
    };
  } catch (error) {
    console.error('Error Resend:', error);
    return {
      success: false,
      message: 'No pude enviar la notificación de turno. Intentalo de nuevo o anotalo manualmente.'
    };
  }
}
