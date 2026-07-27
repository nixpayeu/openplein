const plein = PleinBridge.createPleinClient();
const status = document.getElementById("status");

async function pay(amount) {
  status.textContent = "Bezig met betalen…";
  try {
    const { status: s } = await plein.pay({
      amount, currency: "EUR", description: `Donatie Plein-demo € ${amount}`,
    });
    status.textContent = s === "paid" ? "✅ Bedankt voor je steun!" : `Betaling: ${s}`;
  } catch (e) {
    status.textContent = e.code === "PERMISSION_DENIED"
      ? "Je hebt betalen geweigerd." : `Fout: ${e.message}`;
  }
}
document.getElementById("pay").addEventListener("click", (e) => pay(e.target.dataset.amount));
document.getElementById("pay10").addEventListener("click", (e) => pay(e.target.dataset.amount));
