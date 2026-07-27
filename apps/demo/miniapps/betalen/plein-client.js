"use strict";
var PleinBridge = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/client.ts
  var client_exports = {};
  __export(client_exports, {
    PleinError: () => PleinError,
    createPleinClient: () => createPleinClient
  });

  // src/protocol.ts
  var PROTOCOL_VERSION = "0.1";

  // src/client.ts
  var PleinError = class extends Error {
    constructor(code, message) {
      super(message);
      this.code = code;
    }
  };
  function createPleinClient(opts = {}) {
    const target = opts.target ?? window.parent;
    const timeoutMs = opts.timeoutMs ?? 3e4;
    const pending = /* @__PURE__ */ new Map();
    let seq = 0;
    let disposed = false;
    const handleMessage = (ev) => {
      if (ev.source !== target) return;
      const data = ev.data;
      if (typeof data !== "object" || data === null || data.plein !== PROTOCOL_VERSION) return;
      if (!("ok" in data)) return;
      const p = pending.get(data.id);
      if (!p) return;
      pending.delete(data.id);
      clearTimeout(p.timer);
      if (data.ok) p.resolve(data.result);
      else p.reject(new PleinError(data.error.code, data.error.message));
    };
    window.addEventListener("message", handleMessage);
    function call(method, params) {
      if (disposed) return Promise.reject(new PleinError("TIMEOUT", "client disposed"));
      const id = `${Date.now()}-${seq++}`;
      const req = { plein: PROTOCOL_VERSION, id, method, params };
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          if (pending.delete(id)) reject(new PleinError("TIMEOUT", `Geen antwoord op ${method}`));
        }, timeoutMs);
        pending.set(id, { resolve, reject, timer });
        target.postMessage(req, "*");
      });
    }
    return {
      pay: (p) => call("pay", p),
      identity: { request: () => call("identity.request") },
      storage: {
        get: (key) => call("storage.get", { key }),
        set: (key, value) => call("storage.set", { key, value })
      },
      dispose: () => {
        disposed = true;
        window.removeEventListener("message", handleMessage);
        for (const entry of pending.values()) {
          clearTimeout(entry.timer);
          entry.reject(new PleinError("TIMEOUT", "client disposed"));
        }
        pending.clear();
      }
    };
  }
  return __toCommonJS(client_exports);
})();
