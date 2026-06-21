import { google } from 'googleapis';

// ─────────────────────────────────────────────
// GOOGLE SHEETS — Lista de precios de neumáticos
// ─────────────────────────────────────────────
// Estructura esperada de la planilla (hoja "Precios"):
// Columna A: Medida       → ej: 205/55R16
// Columna B: Marca        → ej: Giti, Wanli
// Columna C: Modelo       → ej: GitiSynergyH2 (opcional)
// Columna D: Precio       → ej: $85.000
// Columna E: Stock        → ej: Disponible / Consultar / Sin stock
// Columna F: Notas        → ej: Índice de carga 91H (opcional)

function getAuth() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });
}

function normalizeMedida(medida) {
  // Normaliza distintos formatos: "205 55 r16", "205/55/R16", "205-55R16" → "205/55r16"
  return medida
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[-_]/g, '/')
    .replace(/\/r(\d)/g, 'r$1');
}

export async function buscarPrecio({ medida, marca }) {
  // Si no hay Sheets configurado, devolvemos error claro
  if (!process.env.GOOGLE_SHEETS_ID || !process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    return {
      found: false,
      message: 'La lista de precios todavía no está configurada.'
    };
  }

  try {
    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range: 'Precios!A2:F500' // Fila 1 es el encabezado, traemos hasta 500 filas
    });

    const rows = res.data.values || [];

    if (rows.length === 0) {
      return {
        found: false,
        message: 'La lista de precios está vacía. Consultá con el equipo.'
      };
    }

    const medidaNorm = normalizeMedida(medida);

    const matches = rows.filter(row => {
      if (!row[0]) return false; // Sin medida, saltamos
      const rowMedida = normalizeMedida(row[0]);
      const medidaMatch = rowMedida === medidaNorm || rowMedida.includes(medidaNorm);

      if (!medidaMatch) return false;

      // Filtro por marca si se especificó
      if (marca) {
        const rowMarca = (row[1] || '').toLowerCase();
        return rowMarca.includes(marca.toLowerCase());
      }

      return true;
    });

    if (matches.length === 0) {
      return {
        found: false,
        message: `No encontré precios para la medida ${medida}${marca ? ` de ${marca}` : ''} en la lista actual.`
      };
    }

    const results = matches.map(row => ({
      medida: row[0] || medida,
      marca: row[1] || 'Sin especificar',
      modelo: row[2] || '',
      precio: row[3] || 'Consultar',
      stock: row[4] || 'Disponible',
      notas: row[5] || ''
    }));

    return { found: true, results, total: results.length };

  } catch (error) {
    console.error('Error Google Sheets:', error);
    return {
      found: false,
      message: 'No pude consultar la lista de precios en este momento. Podés preguntar directamente al (0341) 439-0743.'
    };
  }
}
