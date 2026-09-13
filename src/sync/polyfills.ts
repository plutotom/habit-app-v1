import { digest } from "expo-crypto";
import { polyfillWebCrypto } from "expo-standard-web-crypto";

let installed = false;

/** WorkOS PKCE needs WebCrypto; load lazily so offline startup stays clean. */
export function ensureWebCryptoPolyfills() {
  if (installed) return;
  installed = true;

  polyfillWebCrypto();

  if (!globalThis.crypto.subtle) {
    Object.defineProperty(globalThis.crypto, "subtle", {
      configurable: true,
      value: { digest } as SubtleCrypto,
    });
  }
}
