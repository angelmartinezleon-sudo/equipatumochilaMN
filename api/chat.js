module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { prompt } = req.body || {};
  const apiKey = process.env.GEMINI_API_KEY;
  // Toma el modelo de la variable de entorno o usa gemini-3.5-flash-lite por defecto
  const modelName = process.env.IA_MODEL || 'gemini-3.5-flash-lite';

  if (!apiKey) {
    return res.status(500).json({ error: 'Falta la API Key en las variables de entorno de Vercel' });
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json"
    }
  };

  // Reintento automático en caso de congestión puntual
  for (let intento = 1; intento <= 3; intento++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        return res.status(200).json(data);
      }

      // Si Google responde con saturación (429 o 503), espera 2 segundos y reintenta
      if ((response.status === 429 || response.status === 503) && intento < 3) {
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }

      return res.status(response.status).json(data);
    } catch (error) {
      if (intento === 3) {
        return res.status(500).json({ error: error.message || 'Error de conexión con Gemini' });
      }
      await new Promise(r => setTimeout(r, 2000));
    }
  }
};
