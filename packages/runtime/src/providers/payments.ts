export const paymentsProvider = {
  async pay(appId: string, params: unknown, token: string): Promise<{ status: string }> {
    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...(params as object), appId }),
    });
    if (!res.ok) throw new Error(`Betaling aanmaken mislukt (${res.status})`);
    const { id, checkoutUrl } = (await res.json()) as { id: string; checkoutUrl: string };
    window.open(checkoutUrl, "_blank", "noopener");
    const deadline = Date.now() + 5 * 60_000;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 2000));
      const poll = await fetch(`/api/payments/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const { status } = (await poll.json()) as { status: string };
      if (status !== "open") return { status: status === "expired" ? "failed" : status };
    }
    return { status: "failed" };
  },
};
