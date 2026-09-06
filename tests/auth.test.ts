import { beforeEach, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  store: new Map<string, string>(),
  refresh: vi.fn(),
  exchange: vi.fn(),
}));
vi.mock("expo-secure-store", () => ({
  getItemAsync: vi.fn(async (key: string) => mocks.store.get(key) ?? null),
  setItemAsync: vi.fn(async (key: string, value: string) => {
    mocks.store.set(key, value);
  }),
  deleteItemAsync: vi.fn(async (key: string) => {
    mocks.store.delete(key);
  }),
}));
vi.mock("@workos-inc/node", () => ({
  WorkOS: class {
    userManagement = {
      authenticateWithRefreshToken: mocks.refresh,
      authenticateWithCode: mocks.exchange,
    };
  },
}));

const key = "habits.workos.session.v1";
const user = {
  id: "owner",
  email: "test@example.com",
  firstName: null,
  lastName: null,
  profilePictureUrl: null,
};
const session = {
  accessToken: `x.${btoa(JSON.stringify({ exp: 1 }))}.x`,
  refreshToken: "refresh-old",
  user,
};

beforeEach(() => {
  vi.resetModules();
  mocks.store.clear();
  mocks.refresh.mockReset();
  mocks.exchange.mockReset();
  mocks.store.set(key, JSON.stringify(session));
});

test("network failures preserve credentials and local identity for retry", async () => {
  mocks.refresh.mockRejectedValue(new TypeError("Network request failed"));
  const auth = await import("../src/lib/auth");
  await expect(auth.getAccessToken()).rejects.toThrow("Network request failed");
  expect(mocks.store.has(key)).toBe(true);
  expect(await auth.getUser()).toEqual(user);
  mocks.refresh.mockResolvedValue({
    ...session,
    accessToken: "new-token",
    refreshToken: "rotated",
  });
  expect(await auth.getAccessToken()).toBe("new-token");
});

test("revoked refresh credentials clear the session", async () => {
  mocks.refresh.mockRejectedValue({ error: "invalid_grant" });
  const auth = await import("../src/lib/auth");
  expect(await auth.getAccessToken()).toBeNull();
  expect(mocks.store.has(key)).toBe(false);
});

test("concurrent requests share one refresh, and signing out prevents resurrection", async () => {
  let resolve!: (value: typeof session) => void;
  mocks.refresh.mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const auth = await import("../src/lib/auth");
  const first = auth.getAccessToken(true);
  const second = auth.getAccessToken(true);
  await vi.waitFor(() => expect(mocks.refresh).toHaveBeenCalledTimes(1));
  await auth.clearSession();
  resolve({ ...session, refreshToken: "rotated" });
  expect(await first).toBeNull();
  expect(await second).toBeNull();
  expect(mocks.store.has(key)).toBe(false);
});

test("duplicate callback delivery exchanges a code only once", async () => {
  mocks.store.set(
    "habits.workos.pkce.v1",
    JSON.stringify({ codeVerifier: "verifier", expiresAt: Date.now() + 60000 }),
  );
  mocks.exchange.mockResolvedValue(session);
  const auth = await import("../src/lib/auth");
  await Promise.all([auth.handleCallback("code"), auth.handleCallback("code")]);
  await auth.handleCallback("code");
  expect(mocks.exchange).toHaveBeenCalledTimes(1);
});
