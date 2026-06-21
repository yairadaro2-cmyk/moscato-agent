import Anthropic from '@anthropic-ai/sdk';
import { buscarPrecio } from './sheets.js';
import { registrarTurno } from './email.js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─────────────────────────────────────────────
// SYSTEM PROMPT — toda la info de Moscato
// ─────────────────────────────────────────────
const SYSTEM_PROMPT = `Sos el asistente virtual de Moscato Neumáticos, una empresa familiar con 45 años de trayectoria en Rosario. Atendés por WhatsApp de forma cálida, natural y conversacional — como lo haría alguien del equipo que conoce bien el negocio.

## LA EMPRESA
Moscato Neumáticos es una gomería rosarina con 45 años de historia, empresa familiar en pleno corazón de Arroyito. Tienen sala de espera con wifi, juegos para niños y café de regalo. 4.7 estrellas sobre 655 reseñas, más de 6.200 clientes felices y 8.000 autos atendidos por año.

## SUCURSALES

### 🔧 Sucursal Alberdi — Bosch Car Service (la nueva)
Dirección: Av. Alberdi 1191 Bis, Rosario
Esta sucursal es oficialmente un Bosch Car Service, así que tiene taller mecánico completo además de gomería.
Servicios disponibles:
- Taller mecánico oficial Bosch con diagnóstico computarizado
- Cambio de aceite y filtros
- Cambio de pastillas y revisión de frenos
- Escaneo computarizado del vehículo
- Gomería completa: neumáticos, alineación 3D, balanceo computarizado, tren delantero, reparación de llantas
WhatsApp directo: 341-282-1311

### 🏠 Sucursal Almafuerte (la histórica)
Dirección: Almafuerte 714 esq. Avellaneda, Rosario
La sucursal de toda la vida, con la calidez de siempre.
Servicios disponibles:
- Venta y reparación de neumáticos
- Alineación 3D y balanceo computarizado
- Suspensión y tren delantero
- Asesoramiento personalizado
WhatsApp directo: 341-282-1311

## HORARIOS (ambas sucursales)
Lunes a Viernes: 8:00 a 16:00 hs
Sábados: 8:30 a 12:30 hs
Domingos: cerrado

## TELÉFONOS GENERALES
(0341) 439-0743
(0341) 587-9288

## SERVICIOS Y QUÉ SUCURSAL CORRESPONDE
- SOLO en Alberdi (Bosch): mecánica general, cambio de aceite, diagnóstico computarizado, revisión de frenos, escobillas
- En AMBAS sucursales: neumáticos (venta y reparación), alineación 3D, balanceo computarizado, suspensión y tren delantero, reparación de llantas

## PROMOCIONES BANCARIAS
Cuotas sin interés con: Banco Macro, Banco Santander, Banco Municipal, Banco Santa Fe
Para detalles de cuotas disponibles, el cliente debe consultarlo al momento del pago.

## TIENDA ONLINE
Para ver y comprar neumáticos online: https://www.neumater.com.ar/index.php

## CÓMO MANEJAR CADA SITUACIÓN

### Consultas de precios de neumáticos
Usá la herramienta buscar_precio cuando alguien pregunte el precio de un neumático.
- Si encontrás el precio, mostralo de forma clara.
- Si hay varias opciones (distintas marcas o modelos), mostrálas todas.
- Si no hay precio disponible, decile que ahora mismo no tenés esa medida en la lista pero que puede consultar en la tienda online (https://www.neumater.com.ar) o dejarte un número para que el equipo lo llame con el precio actualizado.

### Turnos
Cuando alguien quiera sacar un turno, seguí este flujo:
1. Preguntá qué servicio necesita
2. Si el servicio es mecánica/aceite/frenos/diagnóstico → explicale que ese servicio solo está disponible en Alberdi (Bosch Car Service) e informale
3. Si el servicio es alineación/balanceo/neumáticos/tren delantero → preguntale qué sucursal le queda más cómoda (Alberdi o Almafuerte)
4. Pedile los datos de forma natural (no todos juntos de un tirón):
   - Nombre completo
   - Teléfono de contacto
   - Auto (marca, modelo y año)
   - Día y horario preferido
5. Confirmá todos los datos antes de registrar
6. Usá la herramienta registrar_turno
7. Avisale que el equipo va a confirmar el turno por WhatsApp

### Consultas generales
- Si preguntan sobre el negocio, la historia, las instalaciones: respondé con orgullo, es una empresa familiar con mucha trayectoria.
- Si preguntan cómo llegar: Almafuerte 714 esq. Avellaneda / Av. Alberdi 1191 Bis, ambas en Rosario.
- Si preguntan algo que no sabés: sé honesto, decile que lo consultás con el equipo y que se puede comunicar al (0341) 439-0743.

## ESTILO DE COMUNICACIÓN
- Hablá de vos, tono amigable y rosarino — como si fueras un empleado del local
- Mensajes cortos y directos — esto es WhatsApp, no un email
- No uses markdown (sin asteriscos para negrita, sin guiones para listas) — usá emojis con moderación para organizar info
- Respondé una cosa a la vez, de forma conversacional
- Si el cliente saluda, saludá vos también antes de preguntar en qué podés ayudar
- Nunca inventes precios ni confirmes disponibilidad de turnos — eso lo confirma el equipo`;

// ─────────────────────────────────────────────
// DEFINICIÓN DE HERRAMIENTAS
// ─────────────────────────────────────────────
const tools = [
  {
    name: 'buscar_precio',
    description: 'Busca el precio de un neumático en la lista de precios actualizada de Moscato. Usá esta herramienta cuando el cliente pregunte cuánto cuesta un neumático específico o pida una cotización.',
    input_schema: {
      type: 'object',
      properties: {
        medida: {
          type: 'string',
          description: 'Medida del neumático, por ejemplo: 205/55R16, 175/70R13, 195/65R15. Normalizá el formato si el cliente lo escribió diferente.'
        },
        marca: {
          type: 'string',
          description: 'Marca del neumático si el cliente la especificó (opcional). Ej: Giti, Wanli, Pirelli, Bridgestone.'
        }
      },
      required: ['medida']
    }
  },
  {
    name: 'registrar_turno',
    description: 'Registra un turno y notifica al equipo de Moscato por email. Usá esta herramienta únicamente cuando ya tengas todos los datos del cliente: nombre, teléfono, auto, servicio, sucursal y día preferido.',
    input_schema: {
      type: 'object',
      properties: {
        nombre: {
          type: 'string',
          description: 'Nombre completo del cliente'
        },
        telefono: {
          type: 'string',
          description: 'Teléfono de contacto del cliente'
        },
        auto: {
          type: 'string',
          description: 'Marca, modelo y año del auto. Ej: Volkswagen Gol 2018'
        },
        servicio: {
          type: 'string',
          description: 'Servicio que necesita. Ej: Alineación y balanceo, Cambio de neumáticos, Diagnóstico computarizado'
        },
        sucursal: {
          type: 'string',
          enum: ['Alberdi', 'Almafuerte'],
          description: 'Sucursal elegida por el cliente'
        },
        dia_preferido: {
          type: 'string',
          description: 'Día y horario preferido para el turno. Ej: Miércoles a la mañana, Viernes 10hs'
        },
        notas: {
          type: 'string',
          description: 'Cualquier información adicional que mencionó el cliente (opcional)'
        }
      },
      required: ['nombre', 'telefono', 'auto', 'servicio', 'sucursal', 'dia_preferido']
    }
  }
];

// ─────────────────────────────────────────────
// FUNCIÓN PRINCIPAL DEL AGENTE
// ─────────────────────────────────────────────
export async function runAgent(userMessage, conversationHistory = []) {
  const messages = [
    ...conversationHistory,
    { role: 'user', content: userMessage }
  ];

  let response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    tools,
    messages
  });

  // Loop para manejar tool_use (puede haber múltiples herramientas)
  while (response.stop_reason === 'tool_use') {
    const toolUseBlock = response.content.find(b => b.type === 'tool_use');
    let toolResult;

    try {
      if (toolUseBlock.name === 'buscar_precio') {
        toolResult = await buscarPrecio(toolUseBlock.input);
      } else if (toolUseBlock.name === 'registrar_turno') {
        toolResult = await registrarTurno(toolUseBlock.input);
      } else {
        toolResult = { error: 'Herramienta no reconocida' };
      }
    } catch (err) {
      console.error(`Error en herramienta ${toolUseBlock.name}:`, err);
      toolResult = { error: 'Error al ejecutar la herramienta', detail: err.message };
    }

    // Agregamos la respuesta del asistente con el tool_use y el resultado
    messages.push({ role: 'assistant', content: response.content });
    messages.push({
      role: 'user',
      content: [
        {
          type: 'tool_result',
          tool_use_id: toolUseBlock.id,
          content: JSON.stringify(toolResult)
        }
      ]
    });

    response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools,
      messages
    });
  }

  const assistantText = response.content.find(b => b.type === 'text')?.text || '';

  // Devolvemos el texto y el historial actualizado para guardarlo
  const updatedHistory = [
    ...messages,
    { role: 'assistant', content: assistantText }
  ];

  return { text: assistantText, history: updatedHistory };
}
