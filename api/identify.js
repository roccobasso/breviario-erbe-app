export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo non consentito" });
  }

  try {
    const apiKey = process.env.PLANTNET_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "Chiave API mancante su Vercel" });
    }

    const form = req.body;

    const response = await fetch(`https://my-api.plantnet.org/v2/identify/all?api-key=${apiKey}&lang=it&include-related-images=false&no-reject=true&nb-results=3`, {
      method: "POST",
      body: form
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: "Errore Pl@ntNet",
        details: data
      });
    }

    const best = data.results && data.results[0];

    if (!best) {
      return res.status(200).json({
        error: "Nessun risultato trovato"
      });
    }

    return res.status(200).json({
      bestScientificName: best.species.scientificNameWithoutAuthor,
      score: best.score,
      localMatch: null
    });
  } catch (error) {
    return res.status(500).json({
      error: "Errore interno del server"
    });
  }
}

export const config = {
  api: {
    bodyParser: false
  }
};
