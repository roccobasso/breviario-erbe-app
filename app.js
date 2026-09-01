let allPlants = [];
let filteredPlants = [];

/* =========================
   UTILITÀ
========================= */

function normalizeText(str) {
  return (str || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function stripAuthorFromScientificName(name) {
  const cleaned = normalizeText(name)
    .replace(/\([^)]*\)/g, " ")
    .replace(/[,;].*$/g, " ")
    .replace(/\b[a-z]\./g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const parts = cleaned.split(" ").filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0]} ${parts[1]}`;
  }

  return cleaned;
}

function getScientificGenus(name) {
  const stripped = stripAuthorFromScientificName(name);
  if (!stripped) return "";
  return stripped.split(" ")[0] || "";
}

function extractScientificCandidates(value) {
  const raw = (value || "").toString();

  return raw
    .split(/[\/|]/g)
    .map((part) => stripAuthorFromScientificName(part))
    .filter(Boolean);
}

function splitAliases(value) {
  return (value || "")
    .toString()
    .split(/[,;/|]/g)
    .map((item) => normalizeText(item))
    .filter(Boolean);
}

function normalizeList(values) {
  return (Array.isArray(values) ? values : [])
    .map((item) => normalizeText(item))
    .filter(Boolean);
}

function includesEitherWay(a, b) {
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

function getEl(...ids) {
  for (const id of ids) {
    const el = document.getElementById(id);
    if (el) return el;
  }
  return null;
}

function escapeHtml(str) {
  return (str || "")
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function getPlantCategory(plant) {
  return normalizeText(
    plant.category ||
    plant.categoria ||
    plant.type ||
    plant.gruppo ||
    ""
  );
}

function getPlantItalianName(plant) {
  return (
    plant.italianName ||
    plant.nomeComune ||
    plant.nome ||
    "Senza nome"
  );
}

function getPlantScientificName(plant) {
  return (
    plant.scientificName ||
    plant.nomeScientifico ||
    ""
  );
}

function getPlantDescription(plant) {
  return (
    plant.description ||
    plant.descrizione ||
    ""
  );
}

function getPlantAliases(plant) {
  return (
    plant.aliases ||
    plant.dettoAnche ||
    plant.otherNames ||
    plant["detto/a anche"] ||
    ""
  );
}

function getPlantFamily(plant) {
  return plant.family || plant.famiglia || "";
}

function getPlantBiologicalType(plant) {
  return plant.biologicalType || plant.tipoBiologico || "";
}

function getPlantFlowering(plant) {
  return plant.flowering || plant.fioritura || "";
}

function getPlantFruits(plant) {
  return plant.fruits || plant.frutti || "";
}

function getPlantFoodUse(plant) {
  return plant.foodUse || plant.usoAlimentare || "";
}

function getPlantMedicinalUse(plant) {
  return plant.medicinalUse || plant.usoOfficinale || "";
}

function getPlantToxicity(plant) {
  return plant.toxicity || plant.tossicita || "";
}

function getPlantRecipes(plant) {
  return plant.recipes || plant.ricetteTradizionali || "";
}

function getPlantSimilar(plant) {
  return plant.similarPlants || plant.pianteSimili || "";
}

function getPlantCuriosity(plant) {
  return plant.curiosity || plant.curiosita || "";
}

function uniqueBy(array, keyFn) {
  const seen = new Set();
  const out = [];
  for (const item of array) {
    const key = keyFn(item);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

/* =========================
   ELEMENTI PAGINA
========================= */

const searchInput = getEl("searchInput", "search", "plantSearch");
const categoryFilter = getEl("categoryFilter", "category", "filterCategory");
const plantList = getEl("plantList", "plantsList", "results", "cardsContainer");
const detailBox = getEl("plantDetail", "detailBox", "details", "schedaDettaglio");

const identifyButton = getEl("identifyBtn", "identifyButton");
const identifyImageInput = getEl("identifyImage", "imageInput", "photoInput", "plant-image");
const identifyOrganSelect = getEl("identifyOrgan", "organSelect", "organ-select", "organInput");
const identifyResultBox = getEl("identifyResult", "resultBox", "identifyOutput");

/* =========================
   DEBUG
========================= */

function debugLog(...args) {
  console.log("[DEBUG]", ...args);
}

function debugTablePlants(limit = 15) {
  try {
    const rows = allPlants.slice(0, limit).map((p, i) => ({
      index: i,
      italianName: getPlantItalianName(p),
      scientificName: getPlantScientificName(p),
      aliases: getPlantAliases(p),
      normalizedScientific: extractScientificCandidates(getPlantScientificName(p)).join(" | ")
    }));
    console.table(rows);
  } catch (err) {
    console.warn("Impossibile mostrare tabella debug:", err);
  }
}

/* =========================
   CARICAMENTO DATI
========================= */

async function loadPlants() {
  try {
    const res = await fetch("plants.json", { cache: "no-store" });
    if (!res.ok) {
      throw new Error("Impossibile caricare plants.json");
    }

    const data = await res.json();

    allPlants = Array.isArray(data) ? data : [];
    filteredPlants = [...allPlants];

    debugLog("plants.json caricato");
    debugLog("Numero piante:", allPlants.length);
    debugLog("Prime 10 piante:", allPlants.slice(0, 10));
    debugTablePlants(10);

    populateCategoryFilter();
    renderPlants(filteredPlants);
  } catch (error) {
    console.error(error);

    if (plantList) {
      plantList.innerHTML = `
        <p style="color:red;">
          Errore nel caricamento dell'archivio piante.
        </p>
      `;
    }
  }
}

/* =========================
   FILTRI
========================= */

function populateCategoryFilter() {
  if (!categoryFilter) return;

  const categories = [...new Set(
    allPlants
      .map(getPlantCategory)
      .filter(Boolean)
  )].sort();

  const currentValue = categoryFilter.value;

  categoryFilter.innerHTML = `
    <option value="">Tutte le categorie</option>
    ${categories.map(cat => `<option value="${cat}">${cat}</option>`).join("")}
  `;

  if (currentValue) {
    categoryFilter.value = currentValue;
  }
}

function filterPlants() {
  const query = normalizeText(searchInput?.value || "");
  const selectedCategory = normalizeText(categoryFilter?.value || "");

  filteredPlants = allPlants.filter((plant) => {
    const italianName = normalizeText(getPlantItalianName(plant));
    const scientificName = normalizeText(getPlantScientificName(plant));
    const aliases = normalizeText(getPlantAliases(plant));
    const category = getPlantCategory(plant);
    const description = normalizeText(getPlantDescription(plant));

    const matchesText =
      !query ||
      italianName.includes(query) ||
      scientificName.includes(query) ||
      aliases.includes(query) ||
      description.includes(query);

    const matchesCategory =
      !selectedCategory || category === selectedCategory;

    return matchesText && matchesCategory;
  });

  renderPlants(filteredPlants);
}

/* =========================
   RENDER SCHEDE
========================= */

function renderPlants(plants) {
  if (!plantList) return;

  const counter = getEl("resultsCount", "plantsCount", "countBox", "stats");
  if (counter) {
    counter.textContent = `Schede trovate: ${plants.length}`;
  }

  if (!plants.length) {
    plantList.innerHTML = `<p>Nessuna pianta trovata.</p>`;
    return;
  }

  plantList.innerHTML = plants.map((plant, index) => {
    const id = plant.id || index;
    const description = getPlantDescription(plant);

    return `
      <div class="plant-card" data-id="${id}" style="cursor:pointer;">
        ${
          getPlantCategory(plant)
            ? `<div class="plant-badge">${escapeHtml(getPlantCategory(plant))}</div>`
            : ""
        }
        <h3>${escapeHtml(getPlantItalianName(plant))}</h3>
        <p><em>${escapeHtml(getPlantScientificName(plant))}</em></p>
        ${
          getPlantFamily(plant)
            ? `<p><strong>Famiglia:</strong> ${escapeHtml(getPlantFamily(plant))}</p>`
            : ""
        }
        ${
          description
            ? `<p>${escapeHtml(description.slice(0, 160))}...</p>`
            : ""
        }
      </div>
    `;
  }).join("");

  plantList.querySelectorAll(".plant-card").forEach((card) => {
    card.addEventListener("click", () => {
      const id = card.dataset.id;
      const plant = plants.find((p, i) => String(p.id || i) === String(id));
      if (plant) showPlantDetail(plant);
    });
  });
}

/* =========================
   DETTAGLIO PIANTA
========================= */

function fieldHtml(label, value) {
  if (!value) return "";
  return `
    <p>
      <strong>${escapeHtml(label)}:</strong><br>
      ${escapeHtml(value).replace(/\n/g, "<br>")}
    </p>
  `;
}

function showPlantDetail(plant) {
  if (!detailBox) {
    console.log("Dettaglio pianta:", plant);
    return;
  }

  detailBox.innerHTML = `
    <div class="plant-detail-content">
      <h2>${escapeHtml(getPlantItalianName(plant))}</h2>
      <p><em>${escapeHtml(getPlantScientificName(plant))}</em></p>

      ${fieldHtml("Categoria", plant.category || plant.categoria)}
      ${fieldHtml("Detto/a anche", getPlantAliases(plant))}
      ${fieldHtml("Famiglia", getPlantFamily(plant))}
      ${fieldHtml("Tipo biologico", getPlantBiologicalType(plant))}
      ${fieldHtml("Descrizione", getPlantDescription(plant))}
      ${fieldHtml("Habitat", plant.habitat)}
      ${fieldHtml("Fioritura", getPlantFlowering(plant))}
      ${fieldHtml("Frutti", getPlantFruits(plant))}
      ${fieldHtml("Uso alimentare", getPlantFoodUse(plant))}
      ${fieldHtml("Uso officinale", getPlantMedicinalUse(plant))}
      ${fieldHtml("Tossicità", getPlantToxicity(plant))}
      ${fieldHtml("Ricette tradizionali", getPlantRecipes(plant))}
      ${fieldHtml("Piante simili", getPlantSimilar(plant))}
      ${fieldHtml("Curiosità", getPlantCuriosity(plant))}

      <div style="margin-top:16px;">
        <button id="closeDetailBtn" type="button">Chiudi</button>
      </div>
    </div>
  `;

  detailBox.style.display = "block";
  detailBox.scrollIntoView({ behavior: "smooth", block: "start" });

  const closeBtn = document.getElementById("closeDetailBtn");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      detailBox.style.display = "none";
      detailBox.innerHTML = "";
    });
  }
}

/* =========================
   MATCH PIANTA
========================= */

function findMatchingPlantByScientificName(bestScientificName) {
  const resultScientific = stripAuthorFromScientificName(bestScientificName);
  const resultGenus = getScientificGenus(bestScientificName);

  if (!resultScientific) return null;

  debugLog("Nome restituito da Pl@ntNet:", bestScientificName);
  debugLog("Nome normalizzato risultato:", resultScientific);
  debugLog("Genere risultato:", resultGenus);
  debugLog("Piante caricate:", allPlants.length);

  for (const plant of allPlants) {
    const rawScientific = getPlantScientificName(plant);
    const candidates = extractScientificCandidates(rawScientific);
    const normalizedBest = normalizeText(bestScientificName);

    const isExactOrClose = candidates.some((candidate) => {
      const normalizedCandidate = normalizeText(candidate);

      return (
        normalizedCandidate === resultScientific ||
        normalizedCandidate === normalizedBest ||
        normalizedCandidate.includes(resultScientific) ||
        resultScientific.includes(normalizedCandidate)
      );
    });

    if (isExactOrClose) {
      debugLog("MATCH SCIENTIFICO TROVATO:", {
        italianName: getPlantItalianName(plant),
        rawScientific,
        candidates,
        resultScientific
      });
      return plant;
    }
  }

  return null;
}

function findMatchingPlantByCommonNames(commonNames = []) {
  const normalizedCommonNames = normalizeList(commonNames);

  if (!normalizedCommonNames.length) return null;

  debugLog("Tentativo match con nomi comuni:", normalizedCommonNames);

  for (const plant of allPlants) {
    const italianName = normalizeText(getPlantItalianName(plant));
    const aliases = splitAliases(getPlantAliases(plant));
    const scientificRaw = normalizeText(getPlantScientificName(plant));

    const matched = normalizedCommonNames.some((commonName) => {
      if (!commonName) return false;

      if (includesEitherWay(italianName, commonName)) {
        return true;
      }

      if (aliases.some((alias) => includesEitherWay(alias, commonName))) {
        return true;
      }

      if (includesEitherWay(scientificRaw, commonName)) {
        return true;
      }

      return false;
    });

    if (matched) {
      debugLog("MATCH PER NOME COMUNE TROVATO:", {
        italianName: getPlantItalianName(plant),
        aliases: getPlantAliases(plant),
        scientificName: getPlantScientificName(plant)
      });
      return plant;
    }
  }

  return null;
}

function findMatchingPlantByGenusAndAlias(bestScientificName, commonNames = []) {
  const genus = getScientificGenus(bestScientificName);
  const normalizedCommonNames = normalizeList(commonNames);

  if (!genus || !normalizedCommonNames.length) return null;

  for (const plant of allPlants) {
    const plantScientific = getPlantScientificName(plant);
    const plantGenus = getScientificGenus(plantScientific);
    const italianName = normalizeText(getPlantItalianName(plant));
    const aliases = splitAliases(getPlantAliases(plant));

    if (plantGenus !== genus) {
      continue;
    }

    const hasCommonSupport = normalizedCommonNames.some((commonName) => {
      return (
        includesEitherWay(italianName, commonName) ||
        aliases.some((alias) => includesEitherWay(alias, commonName))
      );
    });

    if (hasCommonSupport) {
      debugLog("MATCH GENERE + NOME COMUNE TROVATO:", {
        italianName: getPlantItalianName(plant),
        scientificName: plantScientific,
        genus,
        aliases: getPlantAliases(plant)
      });
      return plant;
    }
  }

  return null;
}

function findMatchingPlant(bestScientificName, commonNames = []) {
  return (
    findMatchingPlantByScientificName(bestScientificName) ||
    findMatchingPlantByCommonNames(commonNames) ||
    findMatchingPlantByGenusAndAlias(bestScientificName, commonNames) ||
    null
  );
}

/* =========================
   IDENTIFICAZIONE ASSISTITA
========================= */

function findPlantByItalianName(name) {
  const target = normalizeText(name);
  return allPlants.find((p) => normalizeText(getPlantItalianName(p)) === target) || null;
}

function isLappolinaPlant(plant) {
  return normalizeText(getPlantItalianName(plant)) === "lappolina";
}

function isErbaStellaPlant(plant) {
  return normalizeText(getPlantItalianName(plant)) === "erba stella";
}

function buildAmbiguousLappolinaMessage(primaryPlant, secondaryPlant, score) {
  const scoreHtml =
    typeof score === "number"
      ? `<p><strong>Affidabilità del servizio:</strong> ${(score * 100).toFixed(1)}%</p>`
      : "";

  return `
    <h3>Risultato da verificare</h3>
    ${scoreHtml}
    <p>
      Il riconoscimento automatico può confondere <strong>Lappolina</strong> e <strong>Erba stella</strong>.
    </p>
    <p><strong>Candidati plausibili:</strong></p>
    <ol>
      <li>
        <strong>${escapeHtml(getPlantItalianName(primaryPlant))}</strong>
        <em>${escapeHtml(getPlantScientificName(primaryPlant))}</em>
      </li>
      <li>
        <strong>${escapeHtml(getPlantItalianName(secondaryPlant))}</strong>
        <em>${escapeHtml(getPlantScientificName(secondaryPlant))}</em>
      </li>
    </ol>
    <p><strong>Controllo chiave:</strong></p>
    <ul>
      <li><strong>Lappolina</strong>: pianta più <strong>prostrata/tappezzante</strong>, rami aderenti al terreno.</li>
      <li><strong>Erba stella</strong>: più da <strong>rosetta basale</strong>, con <strong>spighe erette</strong>.</li>
    </ul>
    <p>
      Dalla foto tipica che hai mostrato, se la pianta è distesa a raggiera sul suolo, va favorito <strong>Lappolina</strong>.
    </p>
  `;
}

function scoreLocalPlantForFallback(plant) {
  const text = normalizeText([
    getPlantItalianName(plant),
    getPlantScientificName(plant),
    getPlantAliases(plant),
    getPlantDescription(plant),
    plant.habitat || "",
    getPlantSimilar(plant)
  ].join(" "));

  let score = 0;

  if (text.includes("prostrato")) score += 4;
  if (text.includes("tappezzante")) score += 5;
  if (text.includes("aderente al terreno")) score += 5;
  if (text.includes("rosetta")) score += 2;
  if (text.includes("foglie profondamente incise")) score += 2;
  if (text.includes("spighe cilindriche erette")) score -= 1;

  if (isLappolinaPlant(plant)) score += 3;
  if (isErbaStellaPlant(plant)) score += 2;

  return score;
}

function getFallbackCandidates() {
  const scored = allPlants
    .map((plant) => ({ plant, score: scoreLocalPlantForFallback(plant) }))
    .sort((a, b) => b.score - a.score);

  return scored.filter((x) => x.score > 0).slice(0, 5);
}

function renderFallbackCandidates() {
  const candidates = getFallbackCandidates();
  const lappolina = findPlantByItalianName("Lappolina");
  const erbaStella = findPlantByItalianName("Erba stella");

  if (lappolina && erbaStella && identifyResultBox) {
    identifyResultBox.innerHTML = buildAmbiguousLappolinaMessage(lappolina, erbaStella);
    return;
  }

  if (!identifyResultBox) return;

  if (!candidates.length) {
    identifyResultBox.innerHTML = `
      <p style="color:#b00020;">
        Identificazione automatica non disponibile o non affidabile.
      </p>
    `;
    return;
  }

  identifyResultBox.innerHTML = `
    <h3>Identificazione prudente</h3>
    <p>Il servizio automatico non ha restituito un risultato affidabile. Possibili candidati:</p>
    <ol>
      ${candidates.slice(0, 3).map(({ plant }) => `
        <li>
          <strong>${escapeHtml(getPlantItalianName(plant))}</strong>
          <em>${escapeHtml(getPlantScientificName(plant))}</em>
        </li>
      `).join("")}
    </ol>
  `;
}

/* =========================
   IDENTIFICAZIONE PIANTA
========================= */

function normalizeOrganValue(rawValue) {
  const value = normalizeText(rawValue || "auto");

  const mapping = {
    auto: "auto",
    leaf: "leaf",
    foglia: "leaf",
    leaves: "leaf",
    flower: "flower",
    fiore: "flower",
    fruit: "fruit",
    frutto: "fruit",
    bark: "bark",
    corteccia: "bark"
  };

  return mapping[value] || "auto";
}

async function resizeImage(file, maxSize = 1400, quality = 0.82) {
  const objectUrl = URL.createObjectURL(file);

  try {
    const img = await new Promise((resolve, reject) => {
      const image = new Image();

      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Impossibile leggere l'immagine selezionata."));
      image.src = objectUrl;
    });

    let width = img.width;
    let height = img.height;

    if (width > height && width > maxSize) {
      height = Math.round((height * maxSize) / width);
      width = maxSize;
    } else if (height >= width && height > maxSize) {
      width = Math.round((width * maxSize) / height);
      height = maxSize;
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas non disponibile.");
    }

    ctx.drawImage(img, 0, 0, width, height);

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) resolve(result);
          else reject(new Error("Impossibile convertire l'immagine."));
        },
        "image/jpeg",
        quality
      );
    });

    const safeBaseName = (file.name || "foto")
      .replace(/\.[^.]+$/, "")
      .replace(/[^\w\-]+/g, "_")
      .replace(/^_+|_+$/g, "") || "foto";

    return new File([blob], `${safeBaseName}.jpg`, {
      type: "image/jpeg"
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function parseIdentifyResponse(data) {
  if (!data || typeof data !== "object") return null;

  const bestScientificName =
    data.bestScientificName ||
    data.bestScientific ||
    data.scientificName ||
    data.bestMatch?.scientificName ||
    "";

  const commonNames = Array.isArray(data.commonNames)
    ? data.commonNames
    : Array.isArray(data.common_names)
    ? data.common_names
    : [];

  const score =
    typeof data.score === "number"
      ? data.score
      : typeof data.confidence === "number"
      ? data.confidence
      : null;

  return {
    bestScientificName,
    commonNames,
    score,
    raw: data
  };
}

function maybeHandleLappolinaErbaStellaAmbiguity(parsed, matchedPlant) {
  const lappolina = findPlantByItalianName("Lappolina");
  const erbaStella = findPlantByItalianName("Erba stella");

  if (!lappolina || !erbaStella) return false;
  if (!matchedPlant) return false;

  const normalizedMatched = normalizeText(getPlantItalianName(matchedPlant));
  const commonNamesText = normalizeText((parsed.commonNames || []).join(" "));
  const scientificText = normalizeText(parsed.bestScientificName || "");
  const lowConfidence = typeof parsed.score !== "number" || parsed.score < 0.82;

  const mentionsPlantago =
    scientificText.includes("plantago coronopus") ||
    commonNamesText.includes("minutina") ||
    commonNamesText.includes("corno di cervo");

  const mentionsCoronopus =
    scientificText.includes("coronopus") ||
    commonNamesText.includes("zampa di gallo") ||
    commonNamesText.includes("erba cornuta");

  if (normalizedMatched === "erba stella" && lowConfidence) {
    if (identifyResultBox) {
      identifyResultBox.innerHTML = buildAmbiguousLappolinaMessage(
        erbaStella,
        lappolina,
        parsed.score
      );
    }
    return true;
  }

  if (normalizedMatched === "lappolina" && lowConfidence) {
    if (identifyResultBox) {
      identifyResultBox.innerHTML = buildAmbiguousLappolinaMessage(
        lappolina,
        erbaStella,
        parsed.score
      );
    }
    return true;
  }

  if ((mentionsPlantago || mentionsCoronopus) && lowConfidence) {
    if (identifyResultBox) {
      identifyResultBox.innerHTML = buildAmbiguousLappolinaMessage(
        lappolina,
        erbaStella,
        parsed.score
      );
    }
    return true;
  }

  return false;
}

async function identifyPlant() {
  if (!identifyImageInput || !identifyImageInput.files || !identifyImageInput.files[0]) {
    if (identifyResultBox) {
      identifyResultBox.innerHTML = `<p style="color:red;">Seleziona prima un'immagine.</p>`;
    } else {
      alert("Seleziona prima un'immagine.");
    }
    return;
  }

  const originalFile = identifyImageInput.files[0];
  const organValue = normalizeOrganValue(identifyOrganSelect?.value || "auto");

  if (identifyResultBox) {
    identifyResultBox.innerHTML = `<p>Identificazione in corso...</p>`;
  }

  try {
    const resizedFile = await resizeImage(originalFile);

    const formData = new FormData();
    formData.append("image", resizedFile, resizedFile.name);
    formData.append("organ", organValue);

    debugLog("Invio immagine a /api/identify:", {
      originalName: originalFile.name,
      resizedName: resizedFile.name,
      resizedType: resizedFile.type,
      organ: organValue
    });

    const res = await fetch("/api/identify", {
      method: "POST",
      body: formData
    });

    const contentType = res.headers.get("content-type") || "";
    let data;

    if (contentType.includes("application/json")) {
      data = await res.json();
    } else {
      const text = await res.text();
      throw new Error(text || "Risposta non valida dal server.");
    }

    debugLog("Risposta /api/identify:", data);

    if (!res.ok) {
      throw new Error(data?.error || "Errore durante l'identificazione");
    }

    const parsed = parseIdentifyResponse(data);

    if (!parsed || !parsed.bestScientificName) {
      renderFallbackCandidates();
      return;
    }

    let html = `<h3>Risultato Pl@ntNet</h3>`;

    if (parsed.bestScientificName) {
      html += `<p><strong>Nome scientifico:</strong> ${escapeHtml(parsed.bestScientificName)}</p>`;
    }

    if (Array.isArray(parsed.commonNames) && parsed.commonNames.length) {
      html += `<p><strong>Nomi comuni:</strong> ${escapeHtml(parsed.commonNames.join(", "))}</p>`;
    }

    if (typeof parsed.score === "number") {
      html += `<p><strong>Affidabilità:</strong> ${(parsed.score * 100).toFixed(1)}%</p>`;
    }

    const matchedPlant = findMatchingPlant(
      parsed.bestScientificName,
      Array.isArray(parsed.commonNames) ? parsed.commonNames : []
    );

    debugLog("Nome normalizzato:", stripAuthorFromScientificName(parsed.bestScientificName));
    debugLog(
      "Primi nomi scientifici archivio:",
      allPlants.slice(0, 10).map(p => getPlantScientificName(p))
    );

    if (matchedPlant) {
      if (maybeHandleLappolinaErbaStellaAmbiguity(parsed, matchedPlant)) {
        return;
      }

      html += `<p><strong>Scheda trovata nel tuo archivio:</strong> ${escapeHtml(getPlantItalianName(matchedPlant))}</p>`;

      if (identifyResultBox) {
        identifyResultBox.innerHTML = html;
      }

      showPlantDetail(matchedPlant);
      return;
    }

    html += `<p>Pianta identificata, ma non ancora presente nel tuo archivio.</p>`;

    if (identifyResultBox) {
      identifyResultBox.innerHTML = html;
    }
  } catch (error) {
    console.error(error);

    const message = error?.message || "Errore sconosciuto";
    const normalizedMessage = normalizeText(message);

    const isPatternError =
      normalizedMessage.includes("the string did not match the expected pattern") ||
      normalizedMessage.includes("did not match the expected pattern");

    if (isPatternError) {
      if (identifyResultBox) {
        identifyResultBox.innerHTML = `
          <p style="color:#b00020;">
            Il servizio di identificazione ha restituito un formato non valido.
          </p>
          <p>
            L'app evita di mostrare un risultato sbagliato. Qui sotto trovi una disambiguazione prudente.
          </p>
        `;
      }
      renderFallbackCandidates();
      return;
    }

    if (identifyResultBox) {
      identifyResultBox.innerHTML = `
        <p style="color:red;">
          Errore durante l'identificazione: ${escapeHtml(message)}
        </p>
      `;
    }
  }
}

/* =========================
   EVENTI
========================= */

if (searchInput) {
  searchInput.addEventListener("input", filterPlants);
}

if (categoryFilter) {
  categoryFilter.addEventListener("change", filterPlants);
}

if (identifyButton) {
  identifyButton.addEventListener("click", identifyPlant);
}

/* =========================
   AVVIO
========================= */

loadPlants();
