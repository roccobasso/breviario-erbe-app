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

    const image = incoming.get("image") || incoming.get("images");
    const organRaw = incoming.get("organ") || incoming.get("organs") || "auto";

    if (!image) {
      return Response.json(
        { error: "Nessuna immagine ricevuta." },
        { status: 400 }
      );
    }

    const allowedOrgans = ["leaf", "flower", "fruit", "bark", "habit", "auto"];
    const organ = allowedOrgans.includes(String(organRaw).toLowerCase())
      ? String(organRaw).toLowerCase()
      : "auto";

    const plantnetForm = new FormData();
    plantnetForm.append("images", image);

    if (organ !== "auto") {
      plantnetForm.append("organs", organ);
    }

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

    let data;
    const contentType = plantnetResponse.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      data = await plantnetResponse.json();
    } else {
      const text = await plantnetResponse.text();
      return Response.json(
        {
          error: "Risposta non valida da Pl@ntNet",
          details: text || "Risposta vuota"
        },
        { status: plantnetResponse.status || 500 }
      );
    }

    if (!plantnetResponse.ok) {
      return Response.json(
        {
          error: "Errore Pl@ntNet",
          details: data
        },
        { status: plantnetResponse.status || 500 }
      );
    }

    const results = Array.isArray(data?.results) ? data.results : [];
    const best = results[0];

    if (!best) {
      return Response.json(
        { error: "Nessun risultato trovato da Pl@ntNet." },
        { status: 200 }
      );
    }

    return Response.json({
      bestScientificName: best?.species?.scientificNameWithoutAuthor || "",
      score: typeof best?.score === "number" ? best.score : 0,
      commonNames: Array.isArray(best?.species?.commonNames)
        ? best.species.commonNames
        : [],
      localMatch: null,
      results: results.slice(0, 3).map((item) => ({
        scientificName: item?.species?.scientificNameWithoutAuthor || "",
        score: typeof item?.score === "number" ? item.score : 0,
        commonNames: Array.isArray(item?.species?.commonNames)
          ? item.species.commonNames
          : []
      }))
    });
  } catch (error) {
    console.error("Errore API identify:", error);

    return Response.json(
      {
        error: "Errore interno del server",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
