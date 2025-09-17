import { describe, it, expect, beforeEach } from "vitest";
import { Cl } from "@stacks/transactions";

const ERR_NOT_AUTHORIZED = 100;
const ERR_INVALID_AMOUNT = 101;
const ERR_CAMPAIGN_NOT_FOUND = 102;
const ERR_INSUFFICIENT_FUNDS = 104;
const ERR_INVALID_CAMPAIGN = 105;

interface Campaign {
  name: string;
  goal: bigint;
  raised: bigint;
  active: boolean;
  tokensPerStx: bigint;
}

interface Investment {
  amount: bigint;
  tokens: bigint;
  timestamp: bigint;
}

interface Result<T> {
  ok: boolean;
  value: T;
}

class InvestmentPoolMock {
  state: {
    totalInvestments: bigint;
    admin: string;
    campaigns: Map<number, Campaign>;
    investments: Map<string, Investment>;
    balances: Map<string, bigint>;
  } = {
    totalInvestments: BigInt(0),
    admin: "SP000000000000000000002Q6VF78",
    campaigns: new Map(),
    investments: new Map(),
    balances: new Map(),
  };
  caller: string = "ST1TEST";
  stxBalances: Map<string, bigint> = new Map([["ST1TEST", BigInt(10000)]]);

  constructor() {
    this.reset();
  }

  reset() {
    this.state = {
      totalInvestments: BigInt(0),
      admin: "SP000000000000000000002Q6VF78",
      campaigns: new Map(),
      investments: new Map(),
      balances: new Map(),
    };
    this.caller = "ST1TEST";
    this.stxBalances = new Map([["ST1TEST", BigInt(10000)]]);
  }

  isAdmin(): boolean {
    return this.caller === this.state.admin;
  }

  createCampaign(id: number, name: string, goal: number, tokensPerStx: number): Result<boolean> {
    if (!this.isAdmin()) return { ok: false, value: false };
    if (goal <= 0 || tokensPerStx <= 0) return { ok: false, value: false };
    this.state.campaigns.set(id, {
      name,
      goal: BigInt(goal),
      raised: BigInt(0),
      active: true,
      tokensPerStx: BigInt(tokensPerStx),
    });
    return { ok: true, value: true };
  }

  invest(campaignId: number, amount: number): Result<bigint> {
    const caller = this.caller;
    const camp = this.state.campaigns.get(campaignId);
    if (!camp) return { ok: false, value: BigInt(ERR_CAMPAIGN_NOT_FOUND) };
    if (!camp.active) return { ok: false, value: BigInt(ERR_INVALID_CAMPAIGN) };
    if (amount <= 0) return { ok: false, value: BigInt(ERR_INVALID_AMOUNT) };
    if (this.stxBalances.get(caller)! < BigInt(amount)) return { ok: false, value: BigInt(ERR_INSUFFICIENT_FUNDS) };
    const newRaised = camp.raised + BigInt(amount);
    if (newRaised > camp.goal) return { ok: false, value: BigInt(ERR_INVALID_AMOUNT) };
    this.stxBalances.set(caller, this.stxBalances.get(caller)! - BigInt(amount));
    const tokens = BigInt(amount) * camp.tokensPerStx;
    const key = `${caller}-${campaignId}`;
    this.state.investments.set(key, { amount: BigInt(amount), tokens, timestamp: BigInt(0) });
    camp.raised = newRaised;
    this.state.balances.set(caller, (this.state.balances.get(caller) || BigInt(0)) + tokens);
    this.state.totalInvestments += BigInt(amount);
    return { ok: true, value: tokens };
  }

  closeCampaign(id: number): Result<boolean> {
    if (!this.isAdmin()) return { ok: false, value: false };
    const camp = this.state.campaigns.get(id);
    if (!camp) return { ok: false, value: false };
    if (!camp.active) return { ok: false, value: false };
    camp.active = false;
    return { ok: true, value: true };
  }

  getCampaign(id: number): Campaign | null {
    return this.state.campaigns.get(id) || null;
  }

  getInvestment(investor: string, campaign: number): Investment | null {
    const key = `${investor}-${campaign}`;
    return this.state.investments.get(key) || null;
  }

  getBalance(who: string): bigint {
    return this.state.balances.get(who) || BigInt(0);
  }

  getTotalInvestments(): bigint {
    return this.state.totalInvestments;
  }

  transferTokens(to: string, tokens: number): Result<boolean> {
    const fromBalance = this.getBalance(this.caller);
    if (fromBalance < BigInt(tokens)) return { ok: false, value: false };
    if (this.caller === to) return { ok: false, value: false };
    this.state.balances.set(this.caller, fromBalance - BigInt(tokens));
    this.state.balances.set(to, (this.state.balances.get(to) || BigInt(0)) + BigInt(tokens));
    return { ok: true, value: true };
  }

  setAdmin(newAdmin: string): Result<boolean> {
    if (!this.isAdmin()) return { ok: false, value: false };
    this.state.admin = newAdmin;
    return { ok: true, value: true };
  }
}

describe("InvestmentPool", () => {
  let contract: InvestmentPoolMock;

  beforeEach(() => {
    contract = new InvestmentPoolMock();
    contract.reset();
  });

  it("creates a campaign successfully", () => {
    contract.caller = "SP000000000000000000002Q6VF78";
    const result = contract.createCampaign(1, "StartupA", 10000, 100);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const camp = contract.getCampaign(1);
    expect(camp?.name).toBe("StartupA");
    expect(camp?.goal).toEqual(BigInt(10000));
    expect(camp?.raised).toEqual(BigInt(0));
    expect(camp?.active).toBe(true);
    expect(camp?.tokensPerStx).toEqual(BigInt(100));
  });

  it("rejects campaign creation by non-admin", () => {
    const result = contract.createCampaign(1, "StartupA", 10000, 100);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("invests successfully", () => {
    contract.caller = "SP000000000000000000002Q6VF78";
    contract.createCampaign(1, "StartupA", 10000, 100);
    contract.caller = "ST1TEST";
    const result = contract.invest(1, 500);
    expect(result.ok).toBe(true);
    expect(result.value).toEqual(BigInt(50000));
    const camp = contract.getCampaign(1);
    expect(camp?.raised).toEqual(BigInt(500));
    expect(contract.getBalance("ST1TEST")).toEqual(BigInt(50000));
    expect(contract.getTotalInvestments()).toEqual(BigInt(500));
  });

  it("rejects investment in non-existent campaign", () => {
    const result = contract.invest(999, 500);
    expect(result.ok).toBe(false);
    expect(result.value).toEqual(BigInt(ERR_CAMPAIGN_NOT_FOUND));
  });

  it("rejects investment in inactive campaign", () => {
    contract.caller = "SP000000000000000000002Q6VF78";
    contract.createCampaign(1, "StartupA", 10000, 100);
    contract.closeCampaign(1);
    contract.caller = "ST1TEST";
    const result = contract.invest(1, 500);
    expect(result.ok).toBe(false);
    expect(result.value).toEqual(BigInt(ERR_INVALID_CAMPAIGN));
  });

  it("rejects investment with insufficient funds", () => {
    contract.caller = "SP000000000000000000002Q6VF78";
    contract.createCampaign(1, "StartupA", 10000, 100);
    contract.caller = "ST1TEST";
    contract.stxBalances.set("ST1TEST", BigInt(100));
    const result = contract.invest(1, 500);
    expect(result.ok).toBe(false);
    expect(result.value).toEqual(BigInt(ERR_INSUFFICIENT_FUNDS));
  });

  it("closes campaign successfully", () => {
    contract.caller = "SP000000000000000000002Q6VF78";
    contract.createCampaign(1, "StartupA", 10000, 100);
    const result = contract.closeCampaign(1);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const camp = contract.getCampaign(1);
    expect(camp?.active).toBe(false);
  });

  it("rejects closing by non-admin", () => {
    contract.caller = "SP000000000000000000002Q6VF78";
    contract.createCampaign(1, "StartupA", 10000, 100);
    contract.caller = "ST1TEST";
    const result = contract.closeCampaign(1);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("transfers tokens successfully", () => {
    contract.caller = "SP000000000000000000002Q6VF78";
    contract.createCampaign(1, "StartupA", 10000, 100);
    contract.caller = "ST1TEST";
    contract.invest(1, 50);
    const result = contract.transferTokens("ST2TEST", 3000);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.getBalance("ST1TEST")).toEqual(BigInt(2000));
    expect(contract.getBalance("ST2TEST")).toEqual(BigInt(3000));
  });

  it("rejects token transfer with insufficient balance", () => {
    const result = contract.transferTokens("ST2TEST", 1000);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("sets admin successfully", () => {
    contract.caller = "SP000000000000000000002Q6VF78";
    const result = contract.setAdmin("ST2TEST");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.admin).toBe("ST2TEST");
  });

  it("rejects setting admin by non-admin", () => {
    const result = contract.setAdmin("ST2TEST");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("returns correct investment details", () => {
    contract.caller = "SP000000000000000000002Q6VF78";
    contract.createCampaign(1, "StartupA", 10000, 100);
    contract.caller = "ST1TEST";
    contract.invest(1, 100);
    const inv = contract.getInvestment("ST1TEST", 1);
    expect(inv?.amount).toEqual(BigInt(100));
    expect(inv?.tokens).toEqual(BigInt(10000));
  });
});