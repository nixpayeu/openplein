const plein = PleinBridge.createPleinClient();
const KEY = "items";
let items = [];

async function render() {
  document.getElementById("lijst").innerHTML = items
    .map((it, i) => `<li>${it} <button data-i="${i}">×</button></li>`).join("");
}
async function save() { await plein.storage.set(KEY, JSON.stringify(items)); }

document.getElementById("f").addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = document.getElementById("item");
  if (!input.value.trim()) return;
  items.push(input.value.trim()); input.value = "";
  await save(); render();
});
document.getElementById("lijst").addEventListener("click", async (e) => {
  if (e.target.dataset.i === undefined) return;
  items.splice(Number(e.target.dataset.i), 1);
  await save(); render();
});

(async () => {
  try {
    const { email } = await plein.identity.request();
    document.getElementById("wie").textContent = `Lijstje van ${email}`;
  } catch { document.getElementById("wie").textContent = "Niet ingelogd"; }
  items = JSON.parse((await plein.storage.get(KEY)) ?? "[]");
  render();
})();
