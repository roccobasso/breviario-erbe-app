export const runtime = "nodejs";

function normalizeText(value) {
  return (value || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function safeFileName(name) {
  const cleaned = (name || "image.jpg")
    .toString()
    .replace(/[^\w.\-]+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (!cleaned) return "image.jpg";
  if (!/\.[a-z0-9]{2,6}$/i.test(cleaned)) return `${cleaned}.jpg`;
  return cleaned;
}

function normalizeOrgan(raw) {
  const value = normalizeText(raw || "auto");

  const map = {
    auto: "auto",
    leaf: "leaf",
    leaves: "leaf",
    foglia: "leaf",
    flower: "flower",
    fiore: "flower",
    fruit: "fruit",
    frutto: "fruit",
    bark: "bark",
    corteccia: "bark",
    habit: "habit",
    portamento: "habit"
  };

  return map[value] || "auto";
}

function extractResultItem(item) {
  return {
    scientificName:
      item?.species?.scientificNameWithoutAuthor ||
      item?.species?.scientificName ||
      "",
    scientificNameWithAuthor: item?.species?.scientificName || "",
    score: typeof item?.score === "number" ? item.score : 0,
    commonNames: Array.isArray(item?.species?.commonNames)
      ? item.species.commonNames
      : [],
    family:
      item?.species?.family?.scientificNameWithoutAuthor ||
      item?.species?.family?.scientificName ||
      "",
    genus:
      item?.species?.genus?.scientificNameWithoutAuthor ||
      item?.species?.genus?.scientificName ||
      ""
  };
}

function detectAmbiguity(results) {
  const text = normalizeText(
    results
      .map((r) => [
        r.scientificName,
        r.scientificNameWithAuthor,
        r.family,
        r.genus,
        ...(Array.isArray(r.commonNames) ? r.commonNames : [])
      ].join(" "))
      .join(" ")
  );

  const mentionsPlantago =
    text.includes("plantago coronopus") ||
    text.includes("minutina") ||
    text.includes("corno di cervo") ||
    text.includes("erba stella");

  const mentionsCoronopusOrLappolina =
    text.includes("coronopus squamatus") ||
    text.includes("zampa di gallo") ||
    text.includes("erba cornuta") ||
    text.includes("lappolina") ||
    text.includes("coronopus");

  if (mentionsPlantago || mentionsCoronopusOrLappolina) {
    return {
      ambiguous: true,
      pair: ["Lappolina", "Erba stella"],
      note:
        "Possibile confusione tra Lappolina e Erba stella: controllare se il portamento è prostrato/tappezzante oppure a rosetta con spighe erette."
    };
  }

  return {
    ambiguous: false,
    pair: [],
    note: ""
  };
}

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
    const organ = normalizeOrgan(organRaw);

    if (!image) {
      return Response.json(
        { error: "Nessuna immagine ricevuta." },
        { status: 400 }
      );
    }

    if (!(image instanceof Blob)) {
      return Response.json(
        { error: "Il file ricevuto non è un'immagine valida." },
        { status: 400 }
      );
    }

    const originalName =
      typeof image.name === "string" && image.name ? image.name : "image.jpg";
    const fileName = safeFileName(originalName);
    const mimeType =
      typeof image.type === "string" && image.type ? image.type : "image/jpeg";

    const fileBuffer = Buffer.from(await image.arrayBuffer());
    const forwardedBlob = new Blob([fileBuffer], { type: mimeType });

    const plantnetForm = new FormData();
    plantnetForm.append("images", forwardedBlob, fileName);

    if (organ !== "auto") {
      plantnetForm.append("organs", organ);
    }

    const url = new URL("https://my-api.plantnet.org/v2/identify/all");
    url.searchParams.set("api-key", apiKey);
    url.searchParams.set("lang", "it");
    url.searchParams.set("include-related-images", "false");
    url.searchParams.set("no-reject", "true");
    url.searchParams.set("nb-results", "5");

    const plantnetResponse = await fetch(url.toString(), {
      method: "POST",
      body: plantnetForm
    });

    const contentType = plantnetResponse.headers.get("content-type") || "";
    let data = null;

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

    const rawResults = Array.isArray(data?.results) ? data.results : [];
    const results = rawResults.map(extractResultItem);

    if (!results.length) {
      return Response.json(
        {
          error: "Nessun risultato trovato da Pl@ntNet.",
          bestScientificName: "",
          score: 0,
          commonNames: [],
          results: []
        },
        { status: 200 }
      );
    }

    const best = results[0];
    const ambiguity = detectAmbiguity(results);

    return Response.json({
      bestScientificName: best.scientificName || "",
      bestScientificNameWithAuthor: best.scientificNameWithAuthor || "",
      score: typeof best.score === "number" ? best.score : 0,
      commonNames: Array.isArray(best.commonNames) ? best.commonNames : [],
      family: best.family || "",
      genus: best.genus || "",
      ambiguousPair: ambiguity.pair,
      ambiguityNote: ambiguity.note,
      results: results.slice(0, 5)
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
