export async function POST(request) {
  try {
    const apiKey = process.env.PLANTNET_API_KEY;

    if (!apiKey) {
      return Response.json(
        { error: "Chiave API Pl@ntNet mancante su Vercel." },
        { status: 500 }
      );
    }

    const incoming = await request.formData();

    // accetta sia "image" che "images"
    const image =
      incoming.get("image") || incoming.get("images");
    const organ = incoming.get("organ") || incoming.get("organs") || "auto";

    if (!image) {
      return Response.json(
        { error: "Nessuna immagine ricevuta." },
        { status: 400 }
      );
    }

    const plantnetForm = new FormData();
    plantnetForm.append("images", image);
    plantnetForm.append("organs", organ);

    const url =
      `https://my-api.plantnet.org/v2/identify/all` +
      `?api-key=${encodeURIComponent(apiKey)}` +
      `&lang=it` +
      `&include-related-images=false` +
      `&no-reject=true` +
      `&nb-results=3`;

    const plantnetResponse = await fetch(url, {
      method: "POST",
      body: plantnetForm
    });

    const data = await plantnetResponse.json();

    if (!plantnetResponse.ok) {
      return Response.json(
        {
          error: "Errore Pl@ntNet",
          details: data
        },
        { status: plantnetResponse.status }
      );
    }

    const best = data.results && data.results[0];

    if (!best) {
      return Response.json({
        error: "Nessun risultato trovato da Pl@ntNet."
      });
    }

    return Response.json({
      bestScientificName: best.species?.scientificNameWithoutAuthor || "",
      score: best.score || 0,
      commonNames: best.species?.commonNames || [],
      localMatch: null
    });
  } catch (error) {
    return Response.json(
      {
        error: "Errore interno del server",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
