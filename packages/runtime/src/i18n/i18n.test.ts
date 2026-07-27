// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { t, setLocale } from "./index";

describe("i18n", () => {
  it("vertaalt in beide talen en valt terug op de key", () => {
    setLocale("nl"); expect(t("home.title")).toBe("Plein");
    setLocale("en"); expect(t("home.discover")).toBe("Discover");
    expect(t("bestaat.niet")).toBe("bestaat.niet");
  });
});
