module.exports = async function handler(req, res) {
  if (req.method === "GET") {
    const key = process.env.ANTHROPIC_API_KEY || "";
    return res.status(200).json({
      key_exists: !!key,
      key_length: key.length,
      key_prefix: key.slice(0, 10) + "...",
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { imageBase64, mimeType, lifePath, lpDesc } = req.body;

  const numBlock = lifePath
    ? " Camino de Vida " + lifePath + " (" + lpDesc + "): conecta esta energia con la obra de forma poetica."
    : "";

  const sys =
    "Eres ArtyFlow, el alma creativa de ArtyVinos. Analizas obras pintadas en sesiones de pintura y vino. " +
    "Responde siempre en espanol con tono calido, misterioso e intimo. " +
    "Estructura tu respuesta con estos tres titulos exactos: " +
    "LO QUE TU OBRA REVELA: analiza colores, trazos, composicion y emociones en segunda persona. " +
    "TU ESENCIA NUMEROLOGICA: " +
    (lifePath
      ? "conecta el Camino de Vida " + lifePath + " con lo que ves en la obra."
      : "escribe solo: Esta lectura no incluye numerologia.") +
    " EL MENSAJE DE TU CUADRO: conclusion inspiradora de 2-3 lineas que la persona quiera releer. " +
    "Maximo 320 palabras. Nada generico.";

  const content = imageBase64
    ? [
        { type: "image", source: { type: "base64", media_type: mimeType || "image/jpeg", data: imageBase64 } },
        { type: "text", text: "Analiza esta obra creada en ArtyVinos." + numBlock },
      ]
    : "Crea una lectura artistica poetica para una obra de pintura creada en ArtyVinos." + numBlock;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1000,
        system: sys,
        messages: [{ role: "user", content }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data?.error?.message || "API error" });
    }

    const text = data.content?.find((b) => b.type === "text")?.text || "";
    return res.status(200).json({ result: text });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
