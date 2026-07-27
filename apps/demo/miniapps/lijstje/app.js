const plein = PleinBridge.createPleinClient();
const KEY = "items";
let items = [];
let storageAvailable = true;

function render() {
  const ul = document.getElementById("lijst");
  ul.replaceChildren(...items.map((it, i) => {
    const li = document.createElement("li");
    li.textContent = it + " ";
    const btn = document.createElement("button");
    btn.textContent = "×";
    btn.dataset.i = String(i);
    li.appendChild(btn);
    return li;
  }));
}

async function save() {
  try {
    await plein.storage.set(KEY, JSON.stringify(items));
    document.getElementById("status").textContent = "";
  } catch {
    document.getElementById("status").textContent = "Opslag niet beschikbaar";
    storageAvailable = false;
  }
}

document.getElementById("f").addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = document.getElementById("item");
  if (!input.value.trim()) return;
  items.push(input.value.trim()); input.value = "";
  render();
  await save();
});

document.getElementById("lijst").addEventListener("click", async (e) => {
  if (e.target.dataset.i === undefined) return;
  items.splice(Number(e.target.dataset.i), 1);
  render();
  await save();
});

(async () => {
  try {
    const { email } = await plein.identity.request();
    document.getElementById("wie").textContent = `Lijstje van ${email}`;
  } catch { document.getElementById("wie").textContent = "Niet ingelogd"; }

  try {
    items = JSON.parse((await plein.storage.get(KEY)) ?? "[]");
  } catch {
    document.getElementById("status").textContent = "Opslag niet beschikbaar";
    items = [];
    storageAvailable = false;
  }
  render();
})();
