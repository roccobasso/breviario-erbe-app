let allPlants = [];
let filteredPlants = [];

/* =========================
   UTILITÀ
========================= */

function normalizeText(str) {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // toglie accenti
    .replace(/\s+/g, " ")
    .trim();
}

function stripAuthorFromScientificName(name) {
  // Es: "Cichorium intybus L., 1753" -> "cichorium intybus"
  // Es: "Alliaria petiolata (M. Bieb.) Cavara & Grande, 1913" -> "alliaria petiolata"
  const cleaned = normalizeText(name)
    .replace(/\([^)]*\)/g, " ")   // rimuove parti tra parentesi
    .replace(/\b[a-z]\.\b/g, " ") // rimuove iniziali tipo "L."
    .replace(/[,;].*$/g, " ")     // taglia dopo virgola/punto e virgola
    .replace(/\s+/g, " ")
    .trim();

  const parts = cleaned.split(" ");
  if (parts.length >= 2) {
    return `${parts[0]} ${parts[1]}`;
  }
  return cleaned;
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

function getEl(...ids) {
  for (const id of ids) {
    const el = document.getElementById(id);
    if (el) return el;
  }
  return null;
}

function escapeHtml(str) {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
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
    const italianName = normalizeText(plant.italianName || plant.nomeComune || "");
    const scientificName = normalizeText(plant.scientificName || plant.nomeScientifico || "");
    const aliases = normalizeText(plant.aliases || plant.dettoAnche || plant.otherNames || "");
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

    return `
      <div class="plant-card" data-id="${id}" style="cursor:pointer;">
        ${
          getPlantCategory(plant)
            ? `<div class="plant-badge">${escapeHtml(getPlantCategory(plant))}</div>`
            : ""
        }
        <h3>${escapeHtml(plant.italianName || plant.nomeComune || "Senza nome")}</h3>
        <p><em>${escapeHtml(plant.scientificName || plant.nomeScientifico || "")}</em></p>
        ${
          plant.family || plant.famiglia
            ? `<p><strong>Famiglia:</strong> ${escapeHtml(plant.family || plant.famiglia)}</p>`
            : ""
        }
        ${
          plant.description || plant.descrizione
            ? `<p>${escapeHtml((plant.description || plant.descrizione).slice(0, 160))}...</p>`
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

function showPlantDetail(plant) {
  if (!detailBox) {
    console.log("Dettaglio pianta:", plant);
    return;
  }

  detailBox.innerHTML = `
    <div class="plant-detail-content">
      <h2>${escapeHtml(plant.italianName || plant.nomeComune || "Senza nome")}</h2>
      <p><em>${escapeHtml(plant.scientificName || plant.nomeScientifico || "")}</em></p>

      ${fieldHtml("Categoria", plant.category || plant.categoria)}
      ${fieldHtml("Detto/a anche", plant.aliases || plant.dettoAnche || plant.otherNames)}
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
      ${fieldHtml("Curiosità", plant.curiosita || plant.curiosity)}

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

function fieldHtml(label, value) {
  if (!value) return "";
  return `
    <p>
      <strong>${escapeHtml(label)}:</strong><br>
      ${escapeHtml(value).replace(/\n/g, "<br>")}
    </p>
  `;
}

/* =========================
   MATCH NOME SCIENTIFICO
========================= */

function findMatchingPlant(bestScientificName) {
  const resultScientific = stripAuthorFromScientificName(bestScientificName);

  if (!resultScientific) return null;

  return allPlants.find((p) => {
    const full = normalizeText(p.scientificName || p.nomeScientifico || "");
    const short = stripAuthorFromScientificName(full);

    return (
      full === normalizeText(bestScientificName) ||
      short === resultScientific ||
      full.startsWith(resultScientific) ||
      resultScientific.startsWith(short)
    );
  });
}

/* =========================
   IDENTIFICAZIONE PIANTA
========================= */

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

  try {
    const res = await fetch("/api/identify", {
      method: "POST",
      body: formData
    });

    const data = await res.json();

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

    if (matchedPlant) {
      html += `<p><strong>Scheda trovata nel tuo archivio:</strong> ${escapeHtml(matchedPlant.italianName || matchedPlant.nomeComune || matchedPlant.scientificName || "")}</p>`;
      if (identifyResultBox) identifyResultBox.innerHTML = html;
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
