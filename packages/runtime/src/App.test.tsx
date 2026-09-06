// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { App } from "./App";
import { setLocale } from "./i18n";

// Zonder deze vlag klaagt React dat renders buiten act() gebeuren, ook al
// gebruiken we act() hieronder wél; React ziet de jsdom-omgeving anders niet
// als een test-omgeving.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

setLocale("nl");

let container: HTMLDivElement;

function render(el: React.ReactElement): HTMLDivElement {
  container = document.createElement("div");
  document.body.appendChild(container);
  act(() => { createRoot(container).render(el); });
  return container;
}

async function wachtOpMicrotaken() {
  for (let i = 0; i < 20; i++) await Promise.resolve();
}

function antwoord(body: unknown, ok = true, status = 200) {
  return { ok, status, json: () => Promise.resolve(body) } as Response;
}

// Stubt de drie aanroepen die de shell na inloggen doet: de tenant, het
// eigen lidmaatschap en de beheerderstatus. `ledenregister` wordt alleen op
// de tenant gezet als hij expliciet is meegegeven, want het schema keurt een
// niet-boolean waarde (zoals `undefined` als aanwezige sleutel) af.
function stubShellFetch(opts: { ledenregister?: boolean; lid?: boolean; beheerder?: boolean }) {
  vi.stubGlobal("fetch", vi.fn((url: string) => {
    if (url === "/api/tenant") {
      const tenant = {
        hostname: "localhost", name: "Vereniging", catalog: [],
        ...(opts.ledenregister !== undefined ? { ledenregister: opts.ledenregister } : {}),
      };
      return Promise.resolve(antwoord(tenant));
    }
    if (url === "/api/leden/mij") {
      return Promise.resolve(antwoord(null, opts.lid ?? false, opts.lid ? 200 : 404));
    }
    if (url === "/api/leden/beheerder") {
      return Promise.resolve(antwoord({ beheerder: opts.beheerder ?? false }));
    }
    return Promise.resolve(antwoord({}, false, 404));
  }));
}

beforeEach(() => {
  localStorage.setItem("plein.session", JSON.stringify({ email: "lid@example.org", token: "tok" }));
});

afterEach(() => {
  container?.remove();
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe("App: het ledenregister is opt-in per tenant", () => {
  it("toont geen aanmeldformulier zonder ledenregister in de tenantconfiguratie", async () => {
    stubShellFetch({ lid: false });
    const el = render(<App />);
    await act(async () => { await wachtOpMicrotaken(); });
    expect(el.textContent).not.toContain("Word lid");
  });

  it("toont het aanmeldformulier wel met ledenregister: true, voor wie nog geen lid is", async () => {
    stubShellFetch({ ledenregister: true, lid: false });
    const el = render(<App />);
    await act(async () => { await wachtOpMicrotaken(); });
    expect(el.textContent).toContain("Word lid");
  });

  it("toont het aanmeldformulier niet voor wie al lid is, ook met ledenregister: true", async () => {
    stubShellFetch({ ledenregister: true, lid: true });
    const el = render(<App />);
    await act(async () => { await wachtOpMicrotaken(); });
    expect(el.textContent).not.toContain("Word lid");
  });

  it("toont geen aanmeldformulier als ledenregister expliciet false is", async () => {
    stubShellFetch({ ledenregister: false, lid: false });
    const el = render(<App />);
    await act(async () => { await wachtOpMicrotaken(); });
    expect(el.textContent).not.toContain("Word lid");
  });
});
