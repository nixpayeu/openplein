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
  // JSON.stringify i.p.v. een handmatig scheidingsteken: botsingsvrij, ook als
  // appId of het lokale deel van het e-mailadres een "|" bevat.
  const bytes = new TextEncoder().encode(JSON.stringify([salt(), appId, email]));
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
    // Alleen het pseudoniem: geen weergavenaam, anders kunnen twee mini-apps
    // via displayName alsnog vaststellen dat ze hetzelfde lid bedienen.
    async request(appId: string): Promise<{ subject: string }> {
      const { email } = sessie();
      return { subject: await pseudoniem(appId, email) };
    },
    async email(_appId: string): Promise<{ email: string }> {
      return { email: sessie().email };
    },
  };
}
