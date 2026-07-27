const plein = PleinBridge.createPleinClient();
(async () => {
  const eerder = await plein.storage.get("bezocht");
  document.body.insertAdjacentHTML("beforeend",
    eerder ? "<p>Welkom terug!</p>" : "<p>Eerste bezoek 👋</p>");
  await plein.storage.set("bezocht", "ja");
})();
