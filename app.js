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
    .replace(/[\u0300-\u036f]/g, "") // rimuove accenti
    .replace(/\s+/g, " ")
    .trim();
}

function stripAuthorFromScientificName(name) {
  const cleaned = normalizeText(name)
    .replace(/\([^)]*\)/g, " ")
    .replace(/[/|]/g, " ")
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

/* =========================
   ELEMENTI PAGINA
========================= */

const searchInput = getEl("searchInput", "search", "plantSearch");
const categoryFilter = getEl("categoryFilter", "category", "filterCategory");
const plantList = getEl("plantList", "plantsList", "results", "cardsContainer");
const detailBox = getEl("plantDetail", "detailBox", "details", "schedaDettaglio");

const identifyButton = getEl("identifyBtn", "identifyButton");
const identifyImageInput = getEl("identifyImage", "imageInput", "photoInput");
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
      normalizedScientific: stripAuthorFromScientificName(getPlantScientificName(p))
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
    const aliases = normalizeText(
      plant.aliases ||
      plant.dettoAnche ||
      plant.otherNames ||
      plant["detto/a anche"] ||
      ""
    );
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
      ${fieldHtml("Detto/a anche", plant.aliases || plant.dettoAnche || plant.otherNames || plant["detto/a anche"])}
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
   MATCH NOME SCIENTIFICO
========================= */

function findMatchingPlant(bestScientificName) {
  const resultScientific = stripAuthorFromScientificName(bestScientificName);

  if (!resultScientific) return null;

  debugLog("Nome restituito da Pl@ntNet:", bestScientificName);
  debugLog("Nome normalizzato risultato:", resultScientific);
  debugLog("Piante caricate:", allPlants.length);

  for (const plant of allPlants) {
    const rawScientific = getPlantScientificName(plant);
    const normalizedFull = normalizeText(rawScientific);
    const normalizedShort = stripAuthorFromScientificName(rawScientific);
    const normalizedBest = normalizeText(bestScientificName);

    const isMatch =
      normalizedFull === normalizedBest ||
      normalizedShort === resultScientific ||
      normalizedFull.includes(resultScientific) ||
      resultScientific.includes(normalizedShort);

    if (isMatch) {
      debugLog("MATCH TROVATO:", {
        italianName: getPlantItalianName(plant),
        rawScientific,
        normalizedFull,
        normalizedShort,
        resultScientific
      });
      return plant;
    }
  }

  debugLog("Nessun match trovato.");
  debugLog(
    "Primi 20 nomi scientifici archivio:",
    allPlants.slice(0, 20).map(p => getPlantScientificName(p))
  );

  return null;
}

/* =========================
   IDENTIFICAZIONE PIANTA
========================= */

async function resizeImage(file, maxSize = 1280, quality = 0.8) {
  const img = new Image();
  const reader = new FileReader();

  const imageLoaded = new Promise((resolve, reject) => {
    reader.onload = (e) => {
      img.src = e.target.result;
    };
    reader.onerror = reject;
    img.onload = resolve;
    img.onerror = reject;
  });

  reader.readAsDataURL(file);
  await imageLoaded;

  let width = img.width;
  let height = img.height;

  if (width > height) {
    if (width > maxSize) {
      height = Math.round((height * maxSize) / width);
      width = maxSize;
    }
  } else {
    if (height > maxSize) {
      width = Math.round((width * maxSize) / height);
      height = maxSize;
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, width, height);

  const blob = await new Promise((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", quality);
  });

  if (!blob) {
    throw new Error("Impossibile ridurre l'immagine.");
  }

  return new File([blob], "foto-ridotta.jpg", { type: "image/jpeg" });
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

  const file = identifyImageInput.files[0];
  const formData = new FormData();
  formData.append("image", file);

  if (identifyResultBox) {
    identifyResultBox.innerHTML = `<p>Identificazione in corso...</p>`;
  }

  debugLog("Invio immagine a /api/identify:", file.name);

  try {
    const res = await fetch("/api/identify", {
      method: "POST",
      body: formData
    });

    const data = await res.json();

    debugLog("Risposta /api/identify:", data);

    if (!res.ok) {
      throw new Error(data?.error || "Errore durante l'identificazione");
    }

    let html = `<h3>Risultato Pl@ntNet</h3>`;

    if (data.bestScientificName) {
      html += `<p><strong>Nome scientifico:</strong> ${escapeHtml(data.bestScientificName)}</p>`;
    }

    if (typeof data.confidence === "number") {
      html += `<p><strong>Affidabilità:</strong> ${(data.confidence * 100).toFixed(1)}%</p>`;
    }

    const matchedPlant = findMatchingPlant(data.bestScientificName);

    console.log("Nome restituito da Pl@ntNet:", data.bestScientificName);
    console.log("Nome normalizzato:", stripAuthorFromScientificName(data.bestScientificName));
    console.log("Piante caricate:", allPlants.length);
    console.log(
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
    } else {
      html += `<p>Pianta identificata, ma non ancora presente nel tuo archivio.</p>`;
    }

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
