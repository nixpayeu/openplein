// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react";
import { LidWordenView } from "./LidWordenView";
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

// Een gewone `input.value = ...` gaat via React's eigen value-tracking heen
// zonder het onChange-event te raken; via de native setter (zoals React
// Testing Library's fireEvent.change dat ook doet) werkt het wel.
function typ(input: HTMLInputElement, waarde: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!;
  setter.call(input, waarde);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function verstuur(el: HTMLElement) {
  el.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
}

async function wachtOpMicrotaken() {
  for (let i = 0; i < 20; i++) await Promise.resolve();
}

function antwoord(body: unknown, ok = true, status = 200) {
  return { ok, status, json: () => Promise.resolve(body) } as Response;
}

afterEach(() => {
  container?.remove();
  vi.unstubAllGlobals();
});

describe("LidWordenView", () => {
  it("toont een naamveld en een knop", () => {
    const el = render(<LidWordenView token="tok" onLid={() => {}} />);
    expect(el.querySelector("input")).not.toBeNull();
    expect(el.querySelector("button")).not.toBeNull();
  });

  it("doet geen aanroep bij een lege naam", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const el = render(<LidWordenView token="tok" onLid={() => {}} />);
    await act(async () => { verstuur(el); await wachtOpMicrotaken(); });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("roept de terugmeldfunctie aan met het nieuwe lid bij een geslaagde aanroep", async () => {
    const lid = {
      id: "1", email: "jan@example.org", naam: "Jan",
      status: "aangemeld", aangemeldOp: "2026-01-01T00:00:00.000Z",
    };
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(antwoord(lid, true, 201))));
    const onLid = vi.fn();
    const el = render(<LidWordenView token="tok" onLid={onLid} />);
    const input = el.querySelector("input") as HTMLInputElement;
    await act(async () => { typ(input, "Jan"); });
    await act(async () => { verstuur(el); await wachtOpMicrotaken(); });
    expect(onLid).toHaveBeenCalledWith(lid);
  });

  it("stuurt het token mee in de Authorization-header", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(antwoord({ id: "1", email: "x", naam: "Jan", status: "aangemeld", aangemeldOp: "x" }, true, 201)),
    );
    vi.stubGlobal("fetch", fetchMock);
    const el = render(<LidWordenView token="geheime-token" onLid={() => {}} />);
    const input = el.querySelector("input") as HTMLInputElement;
    await act(async () => { typ(input, "Jan"); });
    await act(async () => { verstuur(el); await wachtOpMicrotaken(); });
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer geheime-token");
  });

  it("toont een foutmelding en laat het formulier staan bij een mislukte aanroep", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(antwoord({}, false, 400))));
    const el = render(<LidWordenView token="tok" onLid={() => {}} />);
    const input = el.querySelector("input") as HTMLInputElement;
    await act(async () => { typ(input, "Jan"); });
    await act(async () => { verstuur(el); await wachtOpMicrotaken(); });
    expect(el.textContent).toContain("mislukt");
    expect(el.querySelector("form")).not.toBeNull();
    expect(el.querySelector("input")).not.toBeNull();
  });
});
