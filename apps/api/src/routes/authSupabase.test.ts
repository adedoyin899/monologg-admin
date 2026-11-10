import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { buildApp } from "../app.js";
import { mockNotifyProvider } from "../providers/notify.mock.js";
import { mockCacheProvider } from "../providers/cache.mock.js";
import { signMockSupabaseToken } from "../providers/supabaseAuth.mock.js";
import { CURRENT_TERMS_VERSION } from "@monologg/types";

// ── Prisma mock ──────────────────────────────────────────────────────────────
vi.mock("../db/client.js", () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    creator: { create: vi.fn(), update: vi.fn() },
    client: { create: vi.fn(), update: vi.fn() },
    refreshToken: { create: vi.fn() },
    termsAcceptance: { create: vi.fn() },
    authEvent: { create: vi.fn() },
    userAcquisition: { create: vi.fn().mockResolvedValue({}) },
    $transaction: vi.fn((arg) =>
      Array.isArray(arg) ? Promise.all(arg) : arg(prismaMock),
    ),
  },
}));

import { prisma } from "../db/client.js";
const prismaMock = prisma as any;

// ── Notify mock spy ──────────────────────────────────────────────────────────
vi.mock("../providers/index.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("../providers/index.js")>();
  return {
    ...original,
    notifyProvider: {
      email: vi.fn().mockResolvedValue(undefined),
      sms: vi.fn().mockResolvedValue(undefined),
      inApp: vi.fn().mockResolvedValue(undefined),
    },
  };
});

import { notifyProvider } from "../providers/index.js";
const notifyMock = notifyProvider as {
  email: ReturnType<typeof vi.fn>;
  sms: ReturnType<typeof vi.fn>;
  inApp: ReturnType<typeof vi.fn>;
};

describe("POST /api/v1/auth/session/sync", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    app = await buildApp({ logger: false });
    await app.ready();
    mockCacheProvider.clear();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  it("creates a new TALENT user on first Supabase sign-in (signup_success)", async () => {
    // Arrange: no existing user
    prismaMock.user.findFirst.mockResolvedValue(null);
    const newUser = {
      id: "usr-new-001",
      email: "neo@talent.test",
      userType: "TALENT",
      authProvider: "GOOGLE",
      supabaseUserId: "sub-uuid-001",
      isNewUser: true,
      creator: { name: "Neo Creative" },
      client: null,
    };
    // The route's $transaction callback calls user.create, creator.create,
    // termsAcceptance.create, then user.findUniqueOrThrow.
    prismaMock.user.create.mockResolvedValue({ id: "usr-new-001", email: "neo@talent.test" });
    prismaMock.creator.create.mockResolvedValue({ id: "cre-001" });
    prismaMock.termsAcceptance.create.mockResolvedValue({});
    // $transaction invokes the callback with prismaMock; findUniqueOrThrow returns the full user
    prismaMock.user.findUniqueOrThrow.mockResolvedValue(newUser);
    prismaMock.refreshToken.create.mockResolvedValue({});
    prismaMock.authEvent.create.mockResolvedValue({});

    const token = signMockSupabaseToken({ sub: "sub-uuid-001", email: "neo@talent.test" });

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/session/sync",
      payload: {
        supabaseAccessToken: token,
        userType: "TALENT",
        name: "Neo Creative",
        provider: "GOOGLE",
      },
    });

    expect(res.statusCode).toBe(201); // new user → 201
    const body = res.json();
    expect(body).toHaveProperty("accessToken");
    expect(body).toHaveProperty("refreshToken");
    expect(body.user.userType).toBe("TALENT");
    expect(body.user.isNewUser).toBe(true);

    // AuthEvent must be written
    expect(prismaMock.authEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ event: "signup_success", provider: "GOOGLE" }),
      }),
    );

    // SIGNIN_NOTICE notifications must fire
    expect(notifyMock.email).toHaveBeenCalled();
    expect(notifyMock.inApp).toHaveBeenCalled();

    // Welcome email must fire (new user)
    const emailCalls = notifyMock.email.mock.calls;
    const welcomeCall = emailCalls.find((c: any[]) => c[1] === "welcome_supabase");
    expect(welcomeCall).toBeTruthy();
  });

  it("links an existing user by email (linked_existing_account)", async () => {
    // Arrange: user exists by email but no supabaseUserId yet
    const existingUser = {
      id: "usr-existing-001",
      email: "existing@talent.test",
      userType: "TALENT",
      authProvider: "EMAIL",
      supabaseUserId: null, // not linked yet
      isNewUser: false,
      creator: { name: "Existing Creator" },
      client: null,
    };
    prismaMock.user.findFirst.mockResolvedValue(existingUser);
    prismaMock.user.update.mockResolvedValue({
      ...existingUser,
      supabaseUserId: "sub-link-001",
      authProvider: "GOOGLE",
    });
    prismaMock.refreshToken.create.mockResolvedValue({});
    prismaMock.authEvent.create.mockResolvedValue({});

    const token = signMockSupabaseToken({ sub: "sub-link-001", email: "existing@talent.test" });

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/session/sync",
      payload: {
        supabaseAccessToken: token,
        userType: "TALENT",
        provider: "GOOGLE",
      },
    });

    expect(res.statusCode).toBe(200); // linked → 200
    const body = res.json();
    expect(body.user.isNewUser).toBe(false);

    // user.update must be called with supabaseUserId
    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ supabaseUserId: "sub-link-001" }),
      }),
    );

    // AuthEvent: linked_existing_account
    expect(prismaMock.authEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ event: "linked_existing_account" }),
      }),
    );
  });

  it("returns 200 for an already-linked user (signin_success)", async () => {
    const linkedUser = {
      id: "usr-linked-001",
      email: "linked@talent.test",
      userType: "TALENT",
      authProvider: "GOOGLE",
      supabaseUserId: "sub-already-001",
      isNewUser: false,
      creator: { name: "Linked Creator" },
      client: null,
    };
    prismaMock.user.findFirst.mockResolvedValue(linkedUser);
    prismaMock.refreshToken.create.mockResolvedValue({});
    prismaMock.authEvent.create.mockResolvedValue({});

    const token = signMockSupabaseToken({ sub: "sub-already-001", email: "linked@talent.test" });

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/session/sync",
      payload: {
        supabaseAccessToken: token,
        userType: "TALENT",
        provider: "GOOGLE",
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.user.isNewUser).toBe(false);

    // update should NOT be called (already linked)
    expect(prismaMock.user.update).not.toHaveBeenCalled();

    // signin_success event
    expect(prismaMock.authEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ event: "signin_success" }),
      }),
    );
  });

  it("stores avatarUrl on Creator at signup when provided", async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({ id: "usr-new-002", email: "ada@talent.test" });
    prismaMock.creator.create.mockResolvedValue({ id: "cre-002" });
    prismaMock.termsAcceptance.create.mockResolvedValue({});
    prismaMock.user.findUniqueOrThrow.mockResolvedValue({
      id: "usr-new-002",
      email: "ada@talent.test",
      userType: "TALENT",
      isNewUser: true,
      creator: { name: "Ada" },
      client: null,
    });
    prismaMock.refreshToken.create.mockResolvedValue({});
    prismaMock.authEvent.create.mockResolvedValue({});

    const token = signMockSupabaseToken({ sub: "sub-ada-001", email: "ada@talent.test" });

    await app.inject({
      method: "POST",
      url: "/api/v1/auth/session/sync",
      payload: {
        supabaseAccessToken: token,
        userType: "TALENT",
        name: "Ada",
        avatarUrl: "https://lh3.googleusercontent.com/a/ada.jpg",
        provider: "GOOGLE",
      },
    });

    expect(prismaMock.creator.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ avatarUrl: "https://lh3.googleusercontent.com/a/ada.jpg" }),
      }),
    );
  });

  it("stores avatarUrl on Client at signup when provided", async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({ id: "usr-new-003", email: "studio@client.test" });
    prismaMock.client.create.mockResolvedValue({ id: "cli-003" });
    prismaMock.termsAcceptance.create.mockResolvedValue({});
    prismaMock.user.findUniqueOrThrow.mockResolvedValue({
      id: "usr-new-003",
      email: "studio@client.test",
      userType: "CLIENT",
      isNewUser: true,
      creator: null,
      client: { name: "Metro Casting Studio" },
    });
    prismaMock.refreshToken.create.mockResolvedValue({});
    prismaMock.authEvent.create.mockResolvedValue({});

    const token = signMockSupabaseToken({ sub: "sub-metro-001", email: "studio@client.test" });

    await app.inject({
      method: "POST",
      url: "/api/v1/auth/session/sync",
      payload: {
        supabaseAccessToken: token,
        userType: "CLIENT",
        name: "Metro Casting Studio",
        avatarUrl: "https://lh3.googleusercontent.com/a/metro.jpg",
        provider: "GOOGLE",
      },
    });

    expect(prismaMock.client.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ avatarUrl: "https://lh3.googleusercontent.com/a/metro.jpg" }),
      }),
    );
  });

  it("refreshes an existing account's avatarUrl on a returning sign-in", async () => {
    const linkedUser = {
      id: "usr-linked-002",
      email: "linked2@talent.test",
      userType: "TALENT",
      authProvider: "GOOGLE",
      supabaseUserId: "sub-already-002",
      isNewUser: false,
      creator: { id: "cre-linked-002", name: "Linked Creator" },
      client: null,
    };
    prismaMock.user.findFirst.mockResolvedValue(linkedUser);
    prismaMock.refreshToken.create.mockResolvedValue({});
    prismaMock.authEvent.create.mockResolvedValue({});
    prismaMock.creator.update.mockResolvedValue({});

    const token = signMockSupabaseToken({ sub: "sub-already-002", email: "linked2@talent.test" });

    await app.inject({
      method: "POST",
      url: "/api/v1/auth/session/sync",
      payload: {
        supabaseAccessToken: token,
        userType: "TALENT",
        avatarUrl: "https://lh3.googleusercontent.com/a/updated.jpg",
        provider: "GOOGLE",
      },
    });

    expect(prismaMock.creator.update).toHaveBeenCalledWith({
      where: { id: "cre-linked-002" },
      data: { avatarUrl: "https://lh3.googleusercontent.com/a/updated.jpg" },
    });
  });

  it("returns 401 for an expired or invalid Supabase token", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/session/sync",
      payload: {
        supabaseAccessToken: "this.is.not.a.valid.jwt",
        userType: "TALENT",
        provider: "GOOGLE",
      },
    });

    expect(res.statusCode).toBe(401);
    const body = res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 400 for missing supabaseAccessToken", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/session/sync",
      payload: { userType: "TALENT" },
    });

    expect(res.statusCode).toBe(400);
  });
});

describe("POST /api/v1/auth/otp/request", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    app = await buildApp({ logger: false });
    await app.ready();
    mockCacheProvider.clear();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  it("allows the first OTP request for an email", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/otp/request",
      payload: { email: "test@otp.test" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ success: true });
  });

  it("returns 429 on a second OTP request within the 60s cooldown", async () => {
    // First request — sets the rate-limit key
    await app.inject({
      method: "POST",
      url: "/api/v1/auth/otp/request",
      payload: { email: "rate@otp.test" },
    });

    // Second request — should be rate-limited
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/otp/request",
      payload: { email: "rate@otp.test" },
    });

    expect(res.statusCode).toBe(429);
    const body = res.json();
    expect(body.error).toBe("Too Many Requests");
    expect(body).toHaveProperty("retryAfterSeconds");
  });

  it("returns 400 for an invalid email", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/otp/request",
      payload: { email: "not-an-email" },
    });

    expect(res.statusCode).toBe(400);
  });
});

describe("Existing password auth regression (session/sync must not break prior paths)", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    app = await buildApp({ logger: false });
    await app.ready();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  it("POST /api/v1/auth/login still works after Phase 12B additions", async () => {
    // Just confirm the endpoint exists and rejects bad credentials with 401/400
    // (not 404 — which would mean the route was accidentally removed)
    prismaMock.user.findUnique.mockResolvedValue(null);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "nobody@test.test", password: "wrongpassword" },
    });

    // 401 means the endpoint is live and performed auth logic; 404 would be a regression
    expect(res.statusCode).not.toBe(404);
  });
});
