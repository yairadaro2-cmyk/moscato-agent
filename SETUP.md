# Agente Moscato Neumáticos — Guía de Setup

## Resumen de servicios necesarios

| Servicio | Para qué | Costo |
|---|---|---|
| Vercel | Hosting del agente | Gratis (Hobby) |
| GitHub | Repositorio del código | Gratis |
| Anthropic | IA (Claude) | ~$5 por millón de tokens |
| Google Sheets | Lista de precios | Gratis |
| Resend | Emails de notificación | Gratis (100 emails/día) |
| Upstash | Memoria del chat | Gratis (10K req/día) |
| ManyChat | Bot WhatsApp | Desde $15/mes (Pro) |

---

## PASO 1 — Subir el código a GitHub

1. Creá un repositorio nuevo en github.com (privado o público, da igual)
2. Subí todos los archivos de esta carpeta al repositorio
3. En Vercel, conectá ese repositorio → se va a deployar automáticamente


## PASO 2 — Configurar Google Sheets (lista de precios)

### Crear la planilla
1. Creá una planilla nueva en Google Sheets
2. Renombrá la primera hoja como **Precios** (exactamente así)
3. En la fila 1, escribí estos encabezados (uno por columna):

```
A1: Medida    B1: Marca    C1: Modelo    D1: Precio    E1: Stock    F1: Notas
```

4. Desde la fila 2 en adelante, cargá los neumáticos. Ejemplo:

```
205/55R16 | Giti | GitiSynergyH2 | $92.000 | Disponible | Índice 91H
175/70R13 | Wanli | S-1063 | $58.000 | Disponible |
195/65R15 | Giti | GitiSynergyH2 | $78.000 | Consultar | Pocas unidades
```

5. Copiá el ID de la planilla desde la URL:
   `docs.google.com/spreadsheets/d/`**ESTE-ES-EL-ID**`/edit`

### Crear credenciales de Google
1. Entrá a [console.cloud.google.com](https://console.cloud.google.com)
2. Creá un proyecto nuevo (o usá uno existente)
3. Activá la API **Google Sheets API** (buscala en el buscador)
4. Andá a **IAM y administración → Cuentas de servicio**
5. Creá una cuenta de servicio nueva → descargá el JSON de credenciales
6. Abrí la planilla de Google Sheets → Compartir → pegá el email de la cuenta de servicio (termina en `@...gserviceaccount.com`) con permiso de **Lector**


## PASO 3 — Configurar Resend (emails)

1. Creá cuenta en [resend.com](https://resend.com)
2. Verificá tu dominio `moscatoneumaticos.com.ar` (o usá el dominio de prueba para empezar)
3. Creá una API Key en Dashboard → API Keys
4. El email de origen va a ser `turnos@moscatoneumaticos.com.ar` (o el que configures)


## PASO 4 — Configurar Upstash Redis (memoria del chat)

1. Creá cuenta en [upstash.com](https://upstash.com)
2. Creá una base de datos Redis → elegí la región más cercana (us-east-1 o similar)
3. Copiá el **REST URL** y el **REST Token** del dashboard


## PASO 5 — Configurar Vercel (variables de entorno)

En el dashboard de Vercel → tu proyecto → Settings → Environment Variables, agregá:

```
ANTHROPIC_API_KEY          → tu clave de api.anthropic.com
GOOGLE_SERVICE_ACCOUNT_JSON → el contenido completo del JSON descargado (en una sola línea)
GOOGLE_SHEETS_ID           → el ID de la planilla
RESEND_API_KEY             → tu clave de Resend
NOTIFICATION_EMAIL         → el email que recibe los turnos (ej: info@moscatoneumaticos.com.ar)
UPSTASH_REDIS_REST_URL     → URL de Upstash
UPSTASH_REDIS_REST_TOKEN   → Token de Upstash
WEBHOOK_SECRET             → inventá una clave larga, ej: moscato-2025-agente-xK8mQ
```

Después del deploy, tu webhook va a estar en:
`https://tu-proyecto.vercel.app/api/chat`


## PASO 6 — Configurar ManyChat

### Conectar WhatsApp Business
1. En ManyChat → Settings → Channels → WhatsApp
2. Conectá tu número de WhatsApp Business (necesitás Meta Business Manager)

### Crear el flujo del agente
1. Andá a **Flows → New Flow**
2. Creá un trigger: **"Default Reply"** (responde a cualquier mensaje no capturado por otros flujos)
3. Agregá una acción: **"External Request"**

### Configurar el External Request
```
URL: https://tu-proyecto.vercel.app/api/chat
Method: POST
Headers:
  Content-Type: application/json
  x-webhook-secret: [el mismo valor que pusiste en WEBHOOK_SECRET]

Body (JSON):
{
  "user_id": "{{user id}}",
  "message": "{{last input text}}"
}
```

### Mapear la respuesta
En el campo "Response Mapping":
- JSONPath: `$.content.messages[0].text`
- Custom Field: creá uno llamado `bot_response` (tipo Text)

Después de la acción External Request, agregá:
- **Send Message** → Type: Text → Content: `{{bot_response}}`

### Tip de optimización
Podés agregar un **Typing Action** de 1-2 segundos antes del Send Message para que parezca más natural.


## PASO 7 — Probar el sistema

1. Mandá un mensaje de WhatsApp al número conectado
2. Chequeá los logs en Vercel → Functions
3. Verificá que lleguen los emails de prueba de turno
4. Actualizá la planilla de precios y confirmá que el agente lee los cambios

### Mensajes de prueba para verificar
- `hola` → debe saludar y ofrecer ayuda
- `tienen el 205/55R16?` → debe consultar precios en Sheets
- `quiero sacar un turno para alineación` → debe iniciar flujo de turno
- `cuánto sale un cambio de aceite` → debe explicar que ese servicio es en Alberdi y ofrecer turno


## Actualizar precios

Solo editá la planilla de Google Sheets → los cambios se reflejan al instante, sin tocar código.


## Soporte

Para consultas técnicas sobre el agente o modificaciones al flujo, el código fuente está en GitHub.
El sistema prompt del agente está en `lib/agent.js` → constante `SYSTEM_PROMPT`.
