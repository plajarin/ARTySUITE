module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { imageBase64, mimeType, lifePath, lpDesc, userName, contacto, tipoContacto, fechaNacimiento, consentimiento } = req.body;

  const nameBlock = userName ? " El nombre de la persona es " + userName + "." : "";
  const numBlock = lifePath
    ? " Su Camino de Vida es el " + lifePath + " (" + lpDesc + "). Es un pilar central: conecta la numerologia con la obra de forma reveladora."
    : " No hay fecha de nacimiento, omite la seccion numerologica.";

  const sys =
    "Eres ArtyFlow, el alma creativa de ArtyVinos. Analizas obras de arte pintadas a mano. " +
    "PRIMERO: determina si la imagen es una pintura a mano o una fotografia convencional. " +
    "Si es una fotografia normal responde SOLO: FOTO_DETECTADA: Parece que has subido una fotografia en lugar de una pintura. Fotografía tu obra terminada para recibir tu lectura. " +
    "Si es una pintura responde en espanol, tono calido y poetico, segunda persona. " +
    "Titulos: LO QUE TU OBRA REVELA / TU ESENCIA NUMEROLOGICA / EL MENSAJE DE TU CUADRO. " +
    "Maximo 350 palabras, minimo 3 lineas por seccion.";

  const content = imageBase64
    ? [
        { type: "image", source: { type: "base64", media_type: mimeType || "image/jpeg", data: imageBase64 } },
        { type: "text", text: "Analiza esta imagen." + nameBlock + numBlock },
      ]
    : "Crea una lectura artistica para una pintura de ArtyVinos." + nameBlock + numBlock;

  try {
    const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1200,
        system: sys,
        messages: [{ role: "user", content }],
      }),
    });

    const aiData = await aiResponse.json();
    if (!aiResponse.ok) {
      return res.status(aiResponse.status).json({ error: aiData?.error?.message || "API error" });
    }

    const text = aiData.content?.find((b) => b.type === "text")?.text || "";

    if (text.startsWith("FOTO_DETECTADA:")) {
      return res.status(200).json({ result: text.replace("FOTO_DETECTADA:", "").trim(), esFoto: true });
    }

    // Guardar en Sheets: siempre si hay nombre o fecha, contacto solo con consentimiento
    const sheetsUrl = process.env.SHEETS_WEBHOOK_URL;
    if (sheetsUrl && (userName || fechaNacimiento)) {
      try {
        const params = new URLSearchParams({
          nombre: userName || "",
          contacto: consentimiento && contacto ? contacto : "",
          tipoContacto: consentimiento && contacto ? (tipoContacto || "") : "",
          fechaNacimiento: fechaNacimiento || "",
          caminoVida: lifePath ? String(lifePath) : "",
          consentimiento: consentimiento ? "Si" : "No",
        });
        await fetch(sheetsUrl + "?" + params.toString(), { method: "GET", redirect: "follow" });
      } catch (e) {
        console.error("Sheets error:", e.message);
      }
    }

    return res.status(200).json({ result: text });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
