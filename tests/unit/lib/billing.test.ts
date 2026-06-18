import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  describeBilling,
  isOrgActive,
  type OrgBillingState,
} from "@/lib/server/billing";

const baseState: OrgBillingState = {
  organizationId: "org-1",
  trialEndsAt: null,
  subscriptionStatus: null,
  stripeCustomerId: null,
  stripeSubscriptionId: null,
};

beforeEach(() => {
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_dummy");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("isOrgActive", () => {
  it("sem Stripe configurado, libera tudo", () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    expect(isOrgActive({ ...baseState })).toBe(true);
  });

  it("status=active libera", () => {
    expect(
      isOrgActive({ ...baseState, subscriptionStatus: "active" }),
    ).toBe(true);
  });

  it("status=trialing libera", () => {
    expect(
      isOrgActive({ ...baseState, subscriptionStatus: "trialing" }),
    ).toBe(true);
  });

  it("status=past_due bloqueia", () => {
    expect(
      isOrgActive({ ...baseState, subscriptionStatus: "past_due" }),
    ).toBe(false);
  });

  it("status=canceled bloqueia", () => {
    expect(
      isOrgActive({ ...baseState, subscriptionStatus: "canceled" }),
    ).toBe(false);
  });

  it("trial implicito (trialEndsAt futuro) libera", () => {
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    expect(isOrgActive({ ...baseState, trialEndsAt: future })).toBe(true);
  });

  it("trial expirado sem subscription bloqueia", () => {
    const past = new Date(Date.now() - 1000);
    expect(isOrgActive({ ...baseState, trialEndsAt: past })).toBe(false);
  });

  it("org legada (sem trial nem subscription) libera por compat", () => {
    expect(isOrgActive({ ...baseState })).toBe(true);
  });

  it("null state bloqueia", () => {
    expect(isOrgActive(null)).toBe(false);
  });
});

describe("describeBilling", () => {
  it("status active", () => {
    const d = describeBilling({ ...baseState, subscriptionStatus: "active" });
    expect(d.status).toBe("active");
  });

  it("trial implicito calcula dias restantes", () => {
    const trialEndsAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    const d = describeBilling({ ...baseState, trialEndsAt });
    expect(d.status).toBe("trial_implicit");
    expect(d.daysLeftInTrial).toBeGreaterThanOrEqual(4);
    expect(d.daysLeftInTrial).toBeLessThanOrEqual(5);
  });

  it("trial expirado vira expired", () => {
    const trialEndsAt = new Date(Date.now() - 1000);
    const d = describeBilling({ ...baseState, trialEndsAt });
    expect(d.status).toBe("expired");
    expect(d.daysLeftInTrial).toBe(0);
  });

  it("past_due", () => {
    const d = describeBilling({
      ...baseState,
      subscriptionStatus: "past_due",
    });
    expect(d.status).toBe("past_due");
  });

  it("hasStripeCustomer reflete presença do id", () => {
    const d = describeBilling({
      ...baseState,
      stripeCustomerId: "cus_123",
      subscriptionStatus: "active",
    });
    expect(d.hasStripeCustomer).toBe(true);
  });
});
