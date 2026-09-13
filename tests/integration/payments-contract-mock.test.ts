import { afterAll, beforeAll } from "vitest";
import { createMockProvider, decideMockPayment } from "@/infra/payments/mock";
import { paymentProviderContract } from "../contract/payment-provider.contract";
import { connectTestDb, truncateAll } from "./support/db";

const { db, close } = connectTestDb();
beforeAll(() => truncateAll(db));
afterAll(() => close());

paymentProviderContract("demo gateway", async () => ({
  provider: createMockProvider(db, "http://localhost:3000"),
  pay: async (page, outcome) => Boolean(await decideMockPayment(db, page.pageRef, outcome === "APPROVE" ? "APPROVE" : "DECLINE_INSUFFICIENT")),
}));
