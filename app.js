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

/* =========================
   ELEMENTI PAGINA
========================= */

const searchInput = getEl("searchInput", "search", "plantSearch");
const categoryFilter = getEl("categoryFilter", "category", "filterCategory");
const plantList = getEl("plantList", "plantsList", "results", "cardsContainer");
const detailBox = getEl("plantDetail", "detailBox", "details", "schedaDettaglio");

const identifyButton = getEl("identifyBtn", "identifyButton");
const identifyImageInput = getEl("identifyImage", "imageInput", "photoInput", "plant-image");
const identifyOrganSelect = getEl("identifyOrgan", "organSelect", "organ-select");
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
    const res = await fetch("plants.json");
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

    const matchesText =
      !query ||
      italianName.includes(query) ||
      scientificName.includes(query) ||
      aliases.includes(query);

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

  const counter = getEl("resultsCount", "plantsCount", "countBox");
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
          plant.family || plant.famiglia
            ? `<p><strong>Famiglia:</strong> ${escapeHtml(plant.family || plant.famiglia)}</p>`
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
      ${fieldHtml("Famiglia", plant.family || plant.famiglia)}
      ${fieldHtml("Tipo biologico", plant.biologicalType || plant.tipoBiologico)}
      ${fieldHtml("Descrizione", plant.description || plant.descrizione)}
      ${fieldHtml("Habitat", plant.habitat)}
      ${fieldHtml("Fioritura", plant.flowering || plant.fioritura)}
      ${fieldHtml("Frutti", plant.fruits || plant.frutti)}
      ${fieldHtml("Uso alimentare", plant.foodUse || plant.usoAlimentare)}
      ${fieldHtml("Uso officinale", plant.medicinalUse || plant.usoOfficinale)}
      ${fieldHtml("Tossicità", plant.toxicity || plant.tossicita)}
      ${fieldHtml("Ricette tradizionali", plant.recipes || plant.ricetteTradizionali)}
      ${fieldHtml("Piante simili", plant.similarPlants || plant.pianteSimili)}
      ${fieldHtml("Curiosità", plant.curiosity || plant.curiosita)}

      <div style="margin-top:16px;">
        <button id="closeDetailBtn">Chiudi</button>
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

  if (!resultScientific) return null;

  debugLog("Nome restituito da Pl@ntNet:", bestScientificName);
  debugLog("Nome normalizzato risultato:", resultScientific);
  debugLog("Piante caricate:", allPlants.length);

  for (const plant of allPlants) {
    const rawScientific = getPlantScientificName(plant);
    const candidates = extractScientificCandidates(rawScientific);
    const normalizedBest = normalizeText(bestScientificName);

    const isMatch = candidates.some((candidate) => {
      const normalizedCandidate = normalizeText(candidate);

      return (
        normalizedCandidate === resultScientific ||
        normalizedCandidate === normalizedBest ||
        normalizedCandidate.includes(resultScientific) ||
        resultScientific.includes(normalizedCandidate)
      );
    });

    if (isMatch) {
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
  const normalizedCommonNames = (Array.isArray(commonNames) ? commonNames : [])
    .map((name) => normalizeText(name))
    .filter(Boolean);

  if (!normalizedCommonNames.length) return null;

  debugLog("Tentativo match con nomi comuni:", normalizedCommonNames);

  for (const plant of allPlants) {
    const italianName = normalizeText(getPlantItalianName(plant));
    const aliases = splitAliases(getPlantAliases(plant));
    const scientificRaw = normalizeText(getPlantScientificName(plant));

    const matched = normalizedCommonNames.some((commonName) => {
      if (!commonName) return false;

      if (italianName === commonName || italianName.includes(commonName) || commonName.includes(italianName)) {
        return true;
      }

      if (aliases.some(alias => alias === commonName || alias.includes(commonName) || commonName.includes(alias))) {
        return true;
      }

      if (scientificRaw.includes(commonName) || commonName.includes(scientificRaw)) {
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

function findMatchingPlant(bestScientificName, commonNames = []) {
  return (
    findMatchingPlantByScientificName(bestScientificName) ||
    findMatchingPlantByCommonNames(commonNames) ||
    null
  );
}

/* =========================
   IDENTIFICAZIONE PIANTA
========================= */

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
  const organValue = identifyOrganSelect?.value || "auto";

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

    let data;
    const contentType = res.headers.get("content-type") || "";

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

    let html = `<h3>Risultato Pl@ntNet</h3>`;

    if (data.bestScientificName) {
      html += `<p><strong>Nome scientifico:</strong> ${escapeHtml(data.bestScientificName)}</p>`;
    }

    if (Array.isArray(data.commonNames) && data.commonNames.length) {
      html += `<p><strong>Nomi comuni:</strong> ${escapeHtml(data.commonNames.join(", "))}</p>`;
    }

    if (typeof data.score === "number") {
      html += `<p><strong>Affidabilità:</strong> ${(data.score * 100).toFixed(1)}%</p>`;
    }

    const matchedPlant = findMatchingPlant(
      data.bestScientificName,
      Array.isArray(data.commonNames) ? data.commonNames : []
    );

    debugLog("Nome normalizzato:", stripAuthorFromScientificName(data.bestScientificName));
    debugLog(
      "Primi nomi scientifici archivio:",
      allPlants.slice(0, 10).map(p => getPlantScientificName(p))
    );

    if (matchedPlant) {
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

    if (identifyResultBox) {
      identifyResultBox.innerHTML = `
        <p style="color:red;">
          Errore durante l'identificazione: ${escapeHtml(error.message)}
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
