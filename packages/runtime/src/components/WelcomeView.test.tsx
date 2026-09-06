// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { WelcomeView } from "./WelcomeView";
import { setLocale } from "../i18n";
import type { TenantConfig } from "@openplein/tenant";

// Zonder deze vlag klaagt React dat renders buiten act() gebeuren, ook al
// gebruiken we act() hieronder wél; React ziet de jsdom-omgeving anders niet
// als een test-omgeving.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// jsdom's navigator.language is "en-US"; deze tests verwachten Nederlandse
// tekst, dus zetten we de taal expliciet (zoals i18n.test.ts ook doet).
setLocale("nl");

const tenant: TenantConfig = {
  hostname: "plein.example.org",
  name: "Digitale Autonomie",
  catalog: [],
  welcome: { nl: { intro: "Onze eigen intro.", sections: [{ title: "Wat je krijgt", items: ["Regel een"] }] } },
};

let container: HTMLDivElement;

function render(el: React.ReactElement): string {
  container = document.createElement("div");
  document.body.appendChild(container);
  act(() => { createRoot(container).render(el); });
  return container.textContent ?? "";
}

afterEach(() => { container?.remove(); });

describe("WelcomeView", () => {
  it("toont de naam van de tenant als woordmerk en kop", () => {
    const tekst = render(<WelcomeView onLogin={() => {}} tenant={tenant} loadError={false} />);
    expect(tekst).toContain("Digitale Autonomie");
  });

  it("toont de tekst van de tenant en niet die van een ander", () => {
    const tekst = render(<WelcomeView onLogin={() => {}} tenant={tenant} loadError={false} />);
    expect(tekst).toContain("Onze eigen intro.");
    expect(tekst).toContain("Regel een");
    expect(tekst).not.toContain("Plein");
  });

  it("toont geen vreemde tekst als de tenant niets geschreven heeft", () => {
    const kaal: TenantConfig = { hostname: "x", name: "Kaal", catalog: [] };
    const tekst = render(<WelcomeView onLogin={() => {}} tenant={kaal} loadError={false} />);
    expect(tekst).toContain("Kaal");
    expect(tekst).not.toContain("demo");
  });

  it("meldt het als de tenant niet geladen kon worden, zonder het merk te noemen", () => {
    const tekst = render(<WelcomeView onLogin={() => {}} tenant={null} loadError={true} />);
    expect(tekst).toContain("kon niet geladen worden");
    // Hoofdletterongevoelig: "plein" mag hier ook niet als "Plein" terugkomen.
    expect(tekst.toLowerCase()).not.toContain("plein");
  });

  it("toont geen halve zinnen zolang de tenant nog laadt", () => {
    const tekst = render(<WelcomeView onLogin={() => {}} tenant={null} loadError={false} />);
    expect(tekst).not.toContain("Welkom bij");
    expect(tekst).not.toContain("Inloggen bij");
    expect(tekst).toContain("Inloggen");
    expect(tekst.toLowerCase()).not.toContain("plein");
  });
});
