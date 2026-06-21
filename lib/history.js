import { Redis } from '@upstash/redis';

// ─────────────────────────────────────────────
// HISTORIAL DE CONVERSACIÓN — Upstash Redis
// ─────────────────────────────────────────────
// El historial permite que el agente recuerde lo que se habló anteriormente,
// haciendo la conversación natural (no empieza de cero cada mensaje).
// Guardamos los últimos 20 turnos (~10 intercambios) por usuario.
// El historial expira a las 24 horas automáticamente.

const MAX_MESSAGES = 20;  // Últimos 20 mensajes del historial
const TTL_SECONDS = 86400; // 24 horas

let redis = null;

function getRedis() {
  if (redis) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  // Verificamos que sean valores reales, no placeholders como "PENDIENTE"
  if (!url || !url.startsWith('https://') || !token || token === 'PENDIENTE') {
    // Sin Redis configurado, funciona en modo sin memoria (cada mensaje es independiente)
    return null;
  }

  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN
  });

  return redis;
}

export async function getHistory(userId) {
  const client = getRedis();
  if (!client) return [];

  try {
    const key = `chat:${userId}`;
    const data = await client.get(key);
    if (!data) return [];
    return Array.isArray(data) ? data : JSON.parse(data);
  } catch (err) {
    console.error('Error al leer historial:', err);
    return [];
  }
}

export async function saveHistory(userId, messages) {
  const client = getRedis();
  if (!client) return;

  try {
    const key = `chat:${userId}`;
    // Mantenemos solo los últimos MAX_MESSAGES mensajes para no acumular tokens
    const trimmed = messages.slice(-MAX_MESSAGES);
    await client.set(key, JSON.stringify(trimmed), { ex: TTL_SECONDS });
  } catch (err) {
    console.error('Error al guardar historial:', err);
  }
}

export async function clearHistory(userId) {
  const client = getRedis();
  if (!client) return;

  try {
    await client.del(`chat:${userId}`);
  } catch (err) {
    console.error('Error al limpiar historial:', err);
  }
}
