module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { prompt } = req.body || {};
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Falta la API Key en las variables de entorno de Vercel' });
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`;
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json"
    }
  };

  // Reintento automático en caso de congestión de tráfico (429 o 503)
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

      // Si Google responde por sobrecarga y aún nos quedan intentos, esperamos 2 segundos
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
