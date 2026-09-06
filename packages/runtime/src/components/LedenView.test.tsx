// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { LedenView } from "./LedenView";
import { setLocale } from "../i18n";

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
  return {
    ok, status,
    json: () => Promise.resolve(body),
    blob: () => Promise.resolve(new Blob([String(body)])),
  } as unknown as Response;
}

afterEach(() => {
  container?.remove();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const leden = [
  { id: "1", email: "jan@example.org", naam: "Jan", status: "lid", aangemeldOp: "2026-01-01T00:00:00.000Z" },
  { id: "2", email: "piet@example.org", naam: "Piet", status: "aangemeld", aangemeldOp: "2026-01-02T00:00:00.000Z" },
];

describe("LedenView", () => {
  it("toont naam, e-mailadres en status van elk lid", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(antwoord(leden))));
    const el = render(<LedenView token="tok" onClose={() => {}} />);
    await act(async () => { await wachtOpMicrotaken(); });
    expect(el.textContent).toContain("Jan");
    expect(el.textContent).toContain("jan@example.org");
    expect(el.textContent).toContain("lid");
    expect(el.textContent).toContain("Piet");
  });

  it("toont een melding bij een lege ledenlijst, geen tabel", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(antwoord([]))));
    const el = render(<LedenView token="tok" onClose={() => {}} />);
    await act(async () => { await wachtOpMicrotaken(); });
    expect(el.textContent).toContain("nog geen leden");
    expect(el.querySelector("table")).toBeNull();
  });

  it("toont bij een 403 een weigering, geen lege tabel", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(antwoord(null, false, 403))));
    const el = render(<LedenView token="tok" onClose={() => {}} />);
    await act(async () => { await wachtOpMicrotaken(); });
    expect(el.textContent).toContain("geen toegang");
    expect(el.querySelector("table")).toBeNull();
    expect(el.textContent).not.toContain("nog geen leden");
  });

  it("haalt de csv op met het token en biedt hem aan als download via een blob-URL", async () => {
    const fetchMock = vi.fn((url: string) =>
      Promise.resolve(url === "/api/leden.csv" ? antwoord("csv-inhoud") : antwoord(leden)),
    );
    vi.stubGlobal("fetch", fetchMock);
    const createObjectURL = vi.fn(() => "blob:mock-url");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
    // jsdom probeert een echte navigatie uit te voeren zodra een <a> met een
    // (nep-)href aangeklikt wordt; dat testen we hier niet, dus neutraliseren.
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const el = render(<LedenView token="geheime-token" onClose={() => {}} />);
    await act(async () => { await wachtOpMicrotaken(); });
    const knop = Array.from(el.querySelectorAll("button")).find((b) => b.textContent?.includes("csv"))!;
    await act(async () => {
      knop.click();
      await wachtOpMicrotaken();
      // De opruimcode gebruikt setTimeout(..., 0) (zie LedenView.tsx) i.p.v.
      // een synchrone revoke; een echte macrotaak-tik is dus nodig om die af
      // te wachten vóórdat de test klaar is — anders vuurt hij pas tijdens
      // een volgend testbestand af, ná het opruimen van deze URL-stub.
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    const laatsteAanroep = fetchMock.mock.calls.at(-1) as unknown as [string, RequestInit];
    expect(laatsteAanroep[0]).toBe("/api/leden.csv");
    expect((laatsteAanroep[1].headers as Record<string, string>).Authorization).toBe("Bearer geheime-token");
    expect(createObjectURL).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });

  it("toont een foutmelding als het ophalen van de csv mislukt, in plaats van niets te doen", async () => {
    const fetchMock = vi.fn((url: string) =>
      Promise.resolve(url === "/api/leden.csv" ? antwoord(null, false, 401) : antwoord(leden)),
    );
    vi.stubGlobal("fetch", fetchMock);
    const el = render(<LedenView token="verlopen-token" onClose={() => {}} />);
    await act(async () => { await wachtOpMicrotaken(); });
    const knop = Array.from(el.querySelectorAll("button")).find((b) => b.textContent?.includes("csv"))!;
    await act(async () => { knop.click(); await wachtOpMicrotaken(); });
    expect(el.textContent).toContain("mislukt");
  });
});
