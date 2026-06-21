import { runAgent } from '@/lib/agent.js';
import { getHistory, saveHistory, clearHistory } from '@/lib/history.js';

// ─────────────────────────────────────────────
// WEBHOOK — recibe mensajes de ManyChat
// ─────────────────────────────────────────────
// ManyChat configuración:
// URL: https://tu-proyecto.vercel.app/api/chat
// Método: POST
// Headers: Content-Type: application/json, x-webhook-secret: [tu WEBHOOK_SECRET]
// Body: { "user_id": "{{user id}}", "message": "{{last input text}}" }
// Response mapping: messages[0].text → custom field "bot_response"

export async function POST(request) {
  try {
    // ── Verificación de seguridad ──────────────
    const secret = request.headers.get('x-webhook-secret');
    if (process.env.WEBHOOK_SECRET && secret !== process.env.WEBHOOK_SECRET) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { user_id, message } = body;

    if (!user_id || !message) {
      return Response.json({ error: 'Faltan campos: user_id y message son requeridos' }, { status: 400 });
    }

    // ── Obtener historial del usuario ──────────
    const history = await getHistory(user_id);

    // ── Correr el agente ───────────────────────
    const { text, history: updatedHistory } = await runAgent(message, history);

    // ── Guardar historial actualizado ──────────
    await saveHistory(user_id, updatedHistory);

    // ── Respuesta en formato ManyChat ──────────
    return Response.json({
      version: 'v2',
      content: {
        messages: [
          {
            type: 'text',
            text: text
          }
        ]
      }
    });

  } catch (error) {
    console.error('Error en webhook:', error);
    // Respuesta de fallback — nunca dejamos al cliente sin respuesta
    return Response.json({
      version: 'v2',
      content: {
        messages: [
          {
            type: 'text',
            text: 'Ups, tuve un problema técnico 😅 Podés escribirnos directamente al (0341) 587-9288 o al 341-282-1311 por WhatsApp.'
          }
        ]
      }
    });
  }
}

// ── Endpoint para limpiar el historial de un usuario ──
// Útil para reiniciar conversaciones largas o durante pruebas
export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const user_id = searchParams.get('user_id');

  if (!user_id) {
    return Response.json({ error: 'user_id requerido' }, { status: 400 });
  }

  await clearHistory(user_id);
  return Response.json({ ok: true, message: `Historial de ${user_id} eliminado` });
}
