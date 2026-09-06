import { digest } from "expo-crypto";
import { polyfillWebCrypto } from "expo-standard-web-crypto";

polyfillWebCrypto();

if (!globalThis.crypto.subtle) {
  Object.defineProperty(globalThis.crypto, "subtle", {
    configurable: true,
    value: { digest } as SubtleCrypto,
  });
}
