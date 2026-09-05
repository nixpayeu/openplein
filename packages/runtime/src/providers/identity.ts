import { PleinError } from "@openplein/bridge";

const SALT_KEY = "plein.identity.salt";

function salt(): string {
  const bestaand = localStorage.getItem(SALT_KEY);
  if (bestaand) return bestaand;
  const nieuw = crypto.randomUUID();
  localStorage.setItem(SALT_KEY, nieuw);
  return nieuw;
}

async function pseudoniem(appId: string, email: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${salt()}|${appId}|${email}`);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function identityProvider(getSession: () => { email: string } | null) {
  const sessie = () => {
    const s = getSession();
    if (!s) throw new PleinError("NOT_AUTHENTICATED", "Niet ingelogd in Plein");
    return s;
  };
  return {
    async request(appId: string): Promise<{ subject: string; displayName: string }> {
      const { email } = sessie();
      return { subject: await pseudoniem(appId, email), displayName: email.split("@")[0] };
    },
    async email(_appId: string): Promise<{ email: string }> {
      return { email: sessie().email };
    },
  };
}
