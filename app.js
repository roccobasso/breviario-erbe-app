let allPlants = [];

const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const plantList = document.getElementById("plantList");
const plantDetail = document.getElementById("plantDetail");
const stats = document.getElementById("stats");

fetch("plants.json")
  .then((res) => res.json())
  .then((data) => {
    allPlants = data;
    renderStats(allPlants);
    renderPlants(allPlants);
  });

searchInput.addEventListener("input", applyFilters);
categoryFilter.addEventListener("change", applyFilters);

function applyFilters() {
  const text = searchInput.value.toLowerCase().trim();
  const category = categoryFilter.value;

  const filtered = allPlants.filter((plant) => {
    const matchesText =
      plant.italianName.toLowerCase().includes(text) ||
      plant.scientificName.toLowerCase().includes(text) ||
      (plant.aliases || []).join(" ").toLowerCase().includes(text);

    const matchesCategory = !category || plant.category === category;

    return matchesText && matchesCategory;
  });

  renderStats(filtered);
  renderPlants(filtered);
}

function renderStats(plants) {
  stats.textContent = `Schede trovate: ${plants.length}`;
}

function renderPlants(plants) {
  plantList.innerHTML = "";

  plants.forEach((plant) => {
    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = `
      <div class="badge ${plant.category}">${plant.category}</div>
      <h3>${plant.italianName}</h3>
      <p><em>${plant.scientificName}</em></p>
      <p><strong>Famiglia:</strong> ${plant.family || "-"}</p>
      <p>${(plant.description || "").slice(0, 160)}...</p>
    `;

    card.addEventListener("click", () => showPlantDetail(plant));
    plantList.appendChild(card);
  });
}

function showPlantDetail(plant) {
  plantDetail.classList.remove("hidden");

  plantDetail.innerHTML = `
    <h2>${plant.italianName}</h2>
    <p><em>${plant.scientificName}</em></p>
    <p><strong>Categoria:</strong> ${plant.category}</p>
    <p><strong>Famiglia:</strong> ${plant.family || "-"}</p>
    <p><strong>Tipo biologico:</strong> ${plant.biologicalType || "-"}</p>
    <p><strong>Descrizione:</strong> ${plant.description || "-"}</p>
    <p><strong>Habitat:</strong> ${plant.habitat || "-"}</p>
    <p><strong>Fioritura:</strong> ${plant.flowering || "-"}</p>
    <p><strong>Frutti:</strong> ${plant.fruits || "-"}</p>
    ${plant.edibleUse ? `<p><strong>Uso alimentare:</strong> ${plant.edibleUse}</p>` : ""}
    ${plant.medicinalUse ? `<p><strong>Uso officinale:</strong> ${plant.medicinalUse}</p>` : ""}
    ${plant.toxicity ? `<p><strong>Tossicità:</strong> ${plant.toxicity}</p>` : ""}
    ${renderList("Nomi alternativi", plant.aliases)}
    ${renderList("Ricette tradizionali", plant.traditionalRecipes)}
    ${renderList("Usi tradizionali", plant.traditionalUses)}
    ${renderList("Piante simili", plant.similarPlants)}
    ${renderList("Curiosità", plant.curiosities)}
    ${renderList("Avvertenze", plant.warnings)}
  `;

  plantDetail.scrollIntoView({ behavior: "smooth" });
}

function renderList(title, items) {
  if (!items || !items.length) return "";
  return `
    <h3>${title}</h3>
    <ul>
      ${items.map((item) => `<li>${item}</li>`).join("")}
    </ul>
  `;
}
