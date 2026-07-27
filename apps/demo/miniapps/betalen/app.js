const plein = PleinBridge.createPleinClient({ timeoutMs: 6 * 60_000 });
const status = document.getElementById("status");

let busy = false;
async function pay(amount) {
  if (busy) return;
  busy = true;
  const buttons = document.querySelectorAll("button");
  buttons.forEach((b) => (b.disabled = true));
  status.textContent = "Bezig met betalen…";
  try {
    const { status: s } = await plein.pay({ amount, currency: "EUR", description: `Donatie Plein-demo € ${amount}` });
    status.textContent = s === "paid" ? "✅ Bedankt voor je steun!" : `Betaling: ${s}`;
  } catch (e) {
    status.textContent = e.code === "PERMISSION_DENIED" ? "Je hebt betalen geweigerd." : `Fout: ${e.message}`;
  } finally {
    busy = false;
    buttons.forEach((b) => (b.disabled = false));
  }
}
document.getElementById("pay").addEventListener("click", (e) => pay(e.target.dataset.amount));
document.getElementById("pay10").addEventListener("click", (e) => pay(e.target.dataset.amount));
