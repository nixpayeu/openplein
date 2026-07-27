import { PleinError } from "@openplein/bridge";

export function identityProvider(getSession: () => { email: string } | null) {
  return {
    async request(_appId: string): Promise<{ email: string }> {
      const session = getSession();
      if (!session) throw new PleinError("NOT_AUTHENTICATED", "Niet ingelogd in Plein");
      return { email: session.email };
    },
  };
}
