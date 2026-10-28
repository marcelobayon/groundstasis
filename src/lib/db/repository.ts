import type { PrismaClient, Prisma } from "@prisma/client";
import { getPrisma, isDatabaseConfigured } from "./client";
import type { Observation, SiteEvaluation, SiteStatus } from "@/lib/analysis/types";
import type { Alert } from "@/lib/analysis/alerts";
import * as map from "./mappers";
import { fromDbStatus, type AnalysisRunData } from "./mappers";
import { insertAlertsIdempotently } from "./idempotency";

export interface DueSite {
  id: string;
  userId: string;
  name: string;
  loanNumber: string | null;
  geometryGeojson: unknown;
  constructionStart: Date | null;
  ownerEmail: string;
}

export interface SiteContext {
  previousStatus: SiteStatus | null;
  alreadySentKeys: string[];
  latestKnownObservationId: string | null;
  recipientEmail: string | null;
  /** CDI: whether this site is upgraded, and its reported milestone (if any). */
  drawIntelligence: boolean;
  milestone: MilestoneRecord | null;
}

/** Everything persistAnalysis needs, decoupled from the job's return type. */
export interface AnalysisPersistInput {
  observations: Observation[];
  evaluation: SiteEvaluation;
  alerts: Alert[];
  run: AnalysisRunData;
}

/** Subscription facts from a Stripe webhook (state is the raw Stripe string). */
export interface StripeSubscriptionInput {
  email: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  priceId?: string;
  state: string;
  seats?: number;
  /** Construction Draw Intelligence add-on quantity (upgraded sites). */
  drawIntelligenceSeats?: number;
  /** epoch seconds */
  currentPeriodEnd?: number;
}

export interface CreateSiteInput {
  userId: string;
  name: string;
  address?: string;
  geometryGeojson: unknown;
  areaAcres?: number;
  loanAmount?: number;
  loanNumber?: string;
  constructionStart?: string;
  constructionEnd?: string;
  /** Opt the new site into Draw Intelligence if a CDI seat is free.
   *  Defaults to auto-enable when a seat is available; pass false to opt out. */
  enableDrawIntelligence?: boolean;
}

export interface Entitlement {
  active: boolean;
  seats: number;
  usedSites: number;
  /** Construction Draw Intelligence seats paid for, and how many are in use. */
  cdiSeats: number;
  cdiUsed: number;
}

/** A site's reported milestone + latest CDI finding, as surfaces read it. */
export interface MilestoneRecord {
  reportedStage: string;
  expectedMilestone: string | null;
  targetDate: Date | null;
  actualStageReported: string | null;
  drawReference: string | null;
  drawAmount: number | null;
  note: string | null;
  lastFindingCode: string | null;
  lastFindingAt: Date | null;
  lastFindingJson: unknown;
  updatedAt: Date;
}

/** A one-time ($9) single-site check row, as the check flow reads it. */
export interface SiteCheckRecord {
  id: string;
  token: string;
  email: string;
  paid: boolean;
  stripePaymentId: string | null;
  siteName: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  areaAcres: number | null;
  geometryGeojson: unknown;
  status: SiteStatus | null;
  stasisScore: number | null;
  confidence: "HIGH" | "MEDIUM" | "LOW" | null;
  provider: string | null;
  resultJson: unknown;
  analyzedAt: Date | null;
  createdAt: Date;
}

// The generated Prisma client gains a `siteCheck` delegate once `prisma
// generate` runs (it does in the Netlify build, which has engine egress). In
// environments where the client can't be regenerated (no engine download), we
// reach the delegate through this precisely-typed accessor, so our writes are
// still field-checked against the shape below.
interface SiteCheckCreateData {
  token: string;
  email: string;
  paid?: boolean;
}
interface SiteCheckUpdateData {
  paid?: boolean;
  stripeSessionId?: string | null;
  stripePaymentId?: string | null;
  siteName?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  areaAcres?: number | null;
  geometryGeojson?: Prisma.InputJsonValue;
  status?: SiteStatus;
  stasisScore?: number;
  confidence?: "HIGH" | "MEDIUM" | "LOW";
  provider?: string;
  resultJson?: Prisma.InputJsonValue;
  analyzedAt?: Date;
  resultEmailedAt?: Date;
  upsellClickedAt?: Date;
}
interface SiteCheckDelegate {
  create(args: { data: SiteCheckCreateData; select?: { id?: boolean; token?: boolean } }): Promise<SiteCheckRecord>;
  findUnique(args: {
    where: { token?: string; id?: string; stripeSessionId?: string };
  }): Promise<SiteCheckRecord | null>;
  update(args: { where: { token?: string; id?: string }; data: SiteCheckUpdateData }): Promise<SiteCheckRecord>;
}
function siteChecks(db: PrismaClient): SiteCheckDelegate {
  return (db as unknown as { siteCheck: SiteCheckDelegate }).siteCheck;
}

// Typed accessor for the SiteMilestone delegate (same pattern as siteChecks:
// regenerated on Netlify, reached through a precise cast where it can't be).
interface MilestoneRow {
  reportedStage: string;
  expectedMilestone: string | null;
  targetDate: Date | null;
  actualStageReported: string | null;
  drawReference: string | null;
  drawAmount: unknown;
  note: string | null;
  lastFindingCode: string | null;
  lastFindingAt: Date | null;
  lastFindingJson: unknown;
  updatedAt: Date;
}
interface SiteMilestoneWriteData {
  reportedStage?: string;
  expectedMilestone?: string | null;
  targetDate?: Date | null;
  actualStageReported?: string | null;
  drawReference?: string | null;
  drawAmount?: number | null;
  note?: string | null;
  lastFindingCode?: string | null;
  lastFindingAt?: Date | null;
  lastFindingJson?: Prisma.InputJsonValue;
}
interface SiteMilestoneCreateData extends SiteMilestoneWriteData {
  site: { connect: { id: string } };
  reportedStage: string;
}
interface SiteMilestoneDelegate {
  findUnique(args: { where: { siteId?: string; id?: string } }): Promise<MilestoneRow | null>;
  upsert(args: {
    where: { siteId: string };
    create: SiteMilestoneCreateData;
    update: SiteMilestoneWriteData;
  }): Promise<MilestoneRow>;
  update(args: { where: { siteId: string }; data: SiteMilestoneWriteData }): Promise<MilestoneRow>;
}
function siteMilestones(db: PrismaClient): SiteMilestoneDelegate {
  return (db as unknown as { siteMilestone: SiteMilestoneDelegate }).siteMilestone;
}
function toMilestoneRecord(row: MilestoneRow): MilestoneRecord {
  return {
    reportedStage: row.reportedStage,
    expectedMilestone: row.expectedMilestone,
    targetDate: row.targetDate,
    actualStageReported: row.actualStageReported,
    drawReference: row.drawReference,
    drawAmount: row.drawAmount == null ? null : Number(row.drawAmount),
    note: row.note,
    lastFindingCode: row.lastFindingCode,
    lastFindingAt: row.lastFindingAt,
    lastFindingJson: row.lastFindingJson,
    updatedAt: row.updatedAt,
  };
}

export class SiteRepository {
  constructor(private readonly db: PrismaClient) {}

  /** Sites eligible for a monitoring run (entitled / not paused). */
  async getSitesDueForAnalysis(limit = 100): Promise<DueSite[]> {
    const sites = await this.db.site.findMany({
      where: { status: { not: "PAUSED" } },
      include: { user: { select: { id: true, email: true } } },
      take: limit,
    });
    return sites.map((s) => ({
      id: s.id,
      name: s.name,
      loanNumber: s.loanNumber,
      geometryGeojson: s.geometryGeojson,
      constructionStart: s.constructionStart,
      userId: s.user.id,
      ownerEmail: s.user.email,
    }));
  }

  /** Prior state a run needs: previous status, sent-alert keys, latest obs id. */
  async getSiteContext(siteId: string): Promise<SiteContext> {
    const site = await this.db.site.findUnique({
      where: { id: siteId },
      include: { user: { select: { email: true } }, milestone: true },
    });
    const alerts = await this.db.siteAlert.findMany({
      where: { siteId },
      select: { idempotencyKey: true },
    });
    const lastObs = await this.db.siteObservation.findFirst({
      where: { siteId },
      orderBy: { observationDate: "desc" },
      select: { providerObservationId: true },
    });
    return {
      previousStatus: site ? fromDbStatus(site.status) : null,
      alreadySentKeys: alerts.map((a) => a.idempotencyKey),
      latestKnownObservationId: lastObs?.providerObservationId ?? null,
      recipientEmail: site?.user.email ?? null,
      drawIntelligence: Boolean(site?.drawIntelligence),
      milestone: site?.milestone ? toMilestoneRecord(site.milestone) : null,
    };
  }

  /**
   * Persist a completed analysis: upsert observations + metrics, update the
   * site's status/score, insert new alerts idempotently (a duplicate
   * idempotencyKey is silently skipped), and record the run for audit.
   */
  async persistAnalysis(siteId: string, input: AnalysisPersistInput): Promise<{ alertsInserted: number; insertedAlerts: Alert[] }> {
    for (const o of input.observations) {
      await this.db.siteObservation.upsert(map.observationUpsert(siteId, o));
    }

    await this.db.site.update({
      where: { id: siteId },
      data: map.siteUpdateFromEvaluation(input.evaluation),
    });

    const insertedAlerts: Alert[] = [];
    const { inserted } = await insertAlertsIdempotently(input.alerts, async (a) => {
      await this.db.siteAlert.create({ data: map.alertCreate(siteId, a) });
      insertedAlerts.push(a);
    });

    await this.db.analysisRun.create({
      data: map.analysisRunCreate(siteId, input.run, input.evaluation),
    });

    return { alertsInserted: inserted, insertedAlerts };
  }

  async recordEmailEvent(e: {
    to: string;
    type: string;
    provider: string;
    providerId?: string;
    subject?: string;
    delivered: boolean;
  }): Promise<void> {
    await this.db.emailEvent.create({
      data: {
        to: e.to,
        type: e.type,
        provider: e.provider,
        providerId: e.providerId ?? null,
        subject: e.subject ?? null,
        delivered: e.delivered,
      },
    });
  }

  // --- entitlement / billing (Stripe webhook writes these) ------------------

  async findOrCreateUserByEmail(email: string): Promise<{ id: string; email: string }> {
    return this.db.user.upsert({
      where: { email },
      update: {},
      create: { email },
      select: { id: true, email: true },
    });
  }

  /** Upsert a subscription by its Stripe id; creates the user if needed. */
  async recordStripeSubscription(input: StripeSubscriptionInput): Promise<{ id: string; email: string; created: boolean }> {
    const user = await this.findOrCreateUserByEmail(input.email);
    const priorSub = await this.db.subscription.findUnique({
      where: { stripeSubscriptionId: input.stripeSubscriptionId },
      select: { id: true },
    });
    const created = !priorSub;
    const state = map.toDbSubscriptionState(input.state);
    const periodEnd = input.currentPeriodEnd ? new Date(input.currentPeriodEnd * 1000) : null;
    await this.db.subscription.upsert({
      where: { stripeSubscriptionId: input.stripeSubscriptionId },
      update: {
        state,
        priceId: input.priceId ?? null,
        seats: input.seats ?? 1,
        drawIntelligenceSeats: input.drawIntelligenceSeats ?? 0,
        currentPeriodEnd: periodEnd,
        stripeCustomerId: input.stripeCustomerId,
      },
      create: {
        user: { connect: { id: user.id } },
        stripeCustomerId: input.stripeCustomerId,
        stripeSubscriptionId: input.stripeSubscriptionId,
        priceId: input.priceId ?? null,
        state,
        seats: input.seats ?? 1,
        drawIntelligenceSeats: input.drawIntelligenceSeats ?? 0,
        currentPeriodEnd: periodEnd,
      },
    });
    return { ...user, created };
  }

  /** Update an existing subscription (by Stripe id) — used by update/delete events. */
  async updateSubscriptionByStripeId(
    stripeSubscriptionId: string,
    patch: { state?: string; currentPeriodEnd?: number; seats?: number; priceId?: string; drawIntelligenceSeats?: number }
  ): Promise<boolean> {
    const existing = await this.db.subscription.findUnique({
      where: { stripeSubscriptionId },
      select: { id: true },
    });
    if (!existing) return false;
    await this.db.subscription.update({
      where: { stripeSubscriptionId },
      data: {
        ...(patch.state ? { state: map.toDbSubscriptionState(patch.state) } : {}),
        ...(patch.currentPeriodEnd ? { currentPeriodEnd: new Date(patch.currentPeriodEnd * 1000) } : {}),
        ...(typeof patch.seats === "number" ? { seats: patch.seats } : {}),
        ...(typeof patch.drawIntelligenceSeats === "number" ? { drawIntelligenceSeats: patch.drawIntelligenceSeats } : {}),
        ...(patch.priceId ? { priceId: patch.priceId } : {}),
      },
    });
    return true;
  }

  /** Pause every site belonging to the user(s) behind a Stripe customer. */
  async pauseSitesForStripeCustomer(stripeCustomerId: string): Promise<number> {
    const subs = await this.db.subscription.findMany({
      where: { stripeCustomerId },
      select: { userId: true },
    });
    const userIds = [...new Set(subs.map((s) => s.userId))];
    if (userIds.length === 0) return 0;
    const res = await this.db.site.updateMany({
      where: { userId: { in: userIds } },
      data: { status: "PAUSED" },
    });
    return res.count;
  }

  async getEntitlement(userId: string): Promise<Entitlement> {
    const subs = await this.db.subscription.findMany({ where: { userId } });
    const active = subs.filter((s) => s.state === "active" || s.state === "trialing");
    const seats = active.reduce((n, s) => n + (s.seats ?? 1), 0);
    const cdiSeats = active.reduce((n, s) => n + (s.drawIntelligenceSeats ?? 0), 0);
    const usedSites = await this.db.site.count({ where: { userId, status: { not: "PAUSED" } } });
    const cdiUsed = await this.db.site.count({
      where: { userId, drawIntelligence: true, status: { not: "PAUSED" } },
    });
    return { active: active.length > 0, seats, usedSites, cdiSeats, cdiUsed };
  }

  /** The user's Stripe customer id (for the billing portal), if any. */
  async getStripeCustomerId(userId: string): Promise<string | null> {
    const sub = await this.db.subscription.findFirst({
      where: { userId, stripeCustomerId: { not: null } },
      orderBy: { createdAt: "desc" },
      select: { stripeCustomerId: true },
    });
    return sub?.stripeCustomerId ?? null;
  }

  /** Create a site, enforcing the subscription's seat entitlement. Auto-enables
   *  Draw Intelligence when the owner has a free CDI seat (unless opted out). */
  async createSite(input: CreateSiteInput): Promise<{ id: string; drawIntelligence: boolean }> {
    const ent = await this.getEntitlement(input.userId);
    if (!ent.active) throw new Error("No active subscription for this user.");
    if (ent.usedSites >= ent.seats) {
      throw new Error(`Site limit reached (${ent.usedSites}/${ent.seats}). Upgrade to add more sites.`);
    }
    const enableCdi = input.enableDrawIntelligence !== false && ent.cdiSeats > ent.cdiUsed;
    const site = await this.db.site.create({
      data: {
        user: { connect: { id: input.userId } },
        name: input.name,
        address: input.address ?? null,
        geometryGeojson: input.geometryGeojson as Prisma.InputJsonValue,
        areaAcres: input.areaAcres ?? null,
        loanAmount: input.loanAmount ?? null,
        loanNumber: input.loanNumber ?? null,
        constructionStart: input.constructionStart ? new Date(input.constructionStart) : null,
        constructionEnd: input.constructionEnd ? new Date(input.constructionEnd) : null,
        status: "DATA_GAP",
        drawIntelligence: enableCdi,
      },
      select: { id: true },
    });
    return { id: site.id, drawIntelligence: enableCdi };
  }

  // --- one-time ($9) single-site check -------------------------------------
  // A check is NOT a subscription and NOT a Site: it never grants seats and
  // never enters getSitesDueForAnalysis(). It is one paid satellite read,
  // keyed by an unguessable token.

  /** Create an unpaid check row at checkout time; `paid` flips in the webhook. */
  async createSiteCheck(input: { email: string; token: string }): Promise<{ id: string; token: string }> {
    return siteChecks(this.db).create({
      data: { email: input.email, token: input.token, paid: false },
      select: { id: true, token: true },
    });
  }

  /** Store the Stripe session id on the check (for reconciliation / idempotency). */
  async attachCheckoutSessionToCheck(token: string, stripeSessionId: string): Promise<void> {
    await siteChecks(this.db).update({ where: { token }, data: { stripeSessionId } });
  }

  /**
   * Mark a check paid, reconciling by the client_reference_id token (preferred)
   * or the Stripe session id. Idempotent. Returns the row's token+email so the
   * caller can email the secure results link, or null when there is no match.
   */
  async markSiteCheckPaid(input: {
    token?: string;
    stripeSessionId?: string;
    stripePaymentId?: string;
  }): Promise<{ token: string; email: string; firstPayment: boolean } | null> {
    const where = input.token
      ? { token: input.token }
      : input.stripeSessionId
        ? { stripeSessionId: input.stripeSessionId }
        : null;
    if (!where) return null;
    const existing = await siteChecks(this.db).findUnique({ where });
    if (!existing) return null;
    const firstPayment = !existing.paid;
    await siteChecks(this.db).update({
      where: { id: existing.id },
      data: { paid: true, stripePaymentId: input.stripePaymentId ?? existing.stripePaymentId },
    });
    return { token: existing.token, email: existing.email, firstPayment };
  }

  async getSiteCheckByToken(token: string): Promise<SiteCheckRecord | null> {
    const row = await siteChecks(this.db).findUnique({ where: { token } });
    return row ? (row as unknown as SiteCheckRecord) : null;
  }

  /** Persist the site the buyer entered (after payment, before analysis). */
  async saveSiteCheckSite(
    token: string,
    site: {
      siteName?: string;
      address?: string;
      latitude: number;
      longitude: number;
      areaAcres: number;
      geometryGeojson: unknown;
    }
  ): Promise<void> {
    await siteChecks(this.db).update({
      where: { token },
      data: {
        siteName: site.siteName ?? null,
        address: site.address ?? null,
        latitude: site.latitude,
        longitude: site.longitude,
        areaAcres: site.areaAcres,
        geometryGeojson: site.geometryGeojson as Prisma.InputJsonValue,
      },
    });
  }

  /** Persist the single analysis result. */
  async saveSiteCheckResult(
    token: string,
    result: {
      status: SiteStatus;
      stasisScore: number;
      confidence: "HIGH" | "MEDIUM" | "LOW";
      provider: string;
      resultJson: unknown;
    }
  ): Promise<void> {
    await siteChecks(this.db).update({
      where: { token },
      data: {
        status: result.status,
        stasisScore: result.stasisScore,
        confidence: result.confidence,
        provider: result.provider,
        resultJson: result.resultJson as Prisma.InputJsonValue,
        analyzedAt: new Date(),
      },
    });
  }

  async markSiteCheckResultEmailed(token: string): Promise<void> {
    await siteChecks(this.db).update({ where: { token }, data: { resultEmailedAt: new Date() } });
  }

  async markSiteCheckUpsellClicked(token: string): Promise<void> {
    await siteChecks(this.db).update({ where: { token }, data: { upsellClickedAt: new Date() } });
  }

  // --- Construction Draw Intelligence ---------------------------------------
  // CDI is a per-site add-on. Entitlement (drawIntelligenceSeats) is set by the
  // Stripe webhook; these methods enforce it server-side.

  /** Enable or disable CDI on a site, enforcing the owner's seat entitlement. */
  async setSiteDrawIntelligence(
    siteId: string,
    enabled: boolean
  ): Promise<{ ok: boolean; enabled: boolean; reason?: string }> {
    const site = await this.db.site.findUnique({
      where: { id: siteId },
      select: { userId: true, drawIntelligence: true },
    });
    if (!site) return { ok: false, enabled: false, reason: "site not found" };
    if (!enabled) {
      await this.db.site.update({ where: { id: siteId }, data: { drawIntelligence: false } });
      return { ok: true, enabled: false };
    }
    if (site.drawIntelligence) return { ok: true, enabled: true };
    const ent = await this.getEntitlement(site.userId);
    if (ent.cdiUsed >= ent.cdiSeats) {
      return { ok: false, enabled: false, reason: "No Draw Intelligence seats available on your plan." };
    }
    await this.db.site.update({ where: { id: siteId }, data: { drawIntelligence: true } });
    return { ok: true, enabled: true };
  }

  async getMilestone(siteId: string): Promise<MilestoneRecord | null> {
    const row = await siteMilestones(this.db).findUnique({ where: { siteId } });
    return row ? toMilestoneRecord(row) : null;
  }

  /** The geometry + name a CDI finding needs to run one live analysis on demand. */
  async getProviderSite(
    siteId: string
  ): Promise<{ id: string; name: string; geometry: unknown; areaAcres: number | null } | null> {
    const site = await this.db.site.findUnique({
      where: { id: siteId },
      select: { id: true, name: true, geometryGeojson: true, areaAcres: true },
    });
    if (!site) return null;
    return { id: site.id, name: site.name, geometry: site.geometryGeojson, areaAcres: site.areaAcres ?? null };
  }

  /** Create or update the reported milestone for a site. */
  async upsertMilestone(
    siteId: string,
    data: {
      reportedStage: string;
      expectedMilestone?: string | null;
      targetDate?: Date | null;
      actualStageReported?: string | null;
      drawReference?: string | null;
      drawAmount?: number | null;
      note?: string | null;
    }
  ): Promise<MilestoneRecord> {
    const common = {
      reportedStage: data.reportedStage,
      expectedMilestone: data.expectedMilestone ?? null,
      targetDate: data.targetDate ?? null,
      actualStageReported: data.actualStageReported ?? null,
      drawReference: data.drawReference ?? null,
      drawAmount: data.drawAmount ?? null,
      note: data.note ?? null,
    };
    const row = await siteMilestones(this.db).upsert({
      where: { siteId },
      create: { site: { connect: { id: siteId } }, ...common },
      update: { ...common },
    });
    return toMilestoneRecord(row);
  }

  /** Store the latest CDI finding on the milestone (display + email idempotency). */
  async saveCdiFinding(siteId: string, finding: { code: string; json: unknown }): Promise<void> {
    await siteMilestones(this.db).update({
      where: { siteId },
      data: {
        lastFindingCode: finding.code,
        lastFindingAt: new Date(),
        lastFindingJson: finding.json as Prisma.InputJsonValue,
      },
    });
  }

  /** Everything the per-site workspace page needs, resolved by site id. */
  async getSiteWorkspace(siteId: string): Promise<{
    site: {
      id: string;
      name: string;
      address: string | null;
      status: SiteStatus | null;
      drawIntelligence: boolean;
      ownerEmail: string | null;
    };
    milestone: MilestoneRecord | null;
    entitlement: { cdiSeats: number; cdiUsed: number };
  } | null> {
    const site = await this.db.site.findUnique({
      where: { id: siteId },
      include: { user: { select: { id: true, email: true } }, milestone: true },
    });
    if (!site) return null;
    const ent = await this.getEntitlement(site.user.id);
    return {
      site: {
        id: site.id,
        name: site.name,
        address: site.address ?? null,
        status: fromDbStatus(site.status),
        drawIntelligence: Boolean(site.drawIntelligence),
        ownerEmail: site.user.email ?? null,
      },
      milestone: site.milestone ? toMilestoneRecord(site.milestone) : null,
      entitlement: { cdiSeats: ent.cdiSeats, cdiUsed: ent.cdiUsed },
    };
  }

  /** Read-only: find a user by email (never creates). For account sign-in. */
  async findUserByEmail(email: string): Promise<{ id: string; email: string } | null> {
    return this.db.user.findUnique({ where: { email }, select: { id: true, email: true } });
  }

  /** Sites owned by a user, for the account portfolio view (read-only). */
  async getSitesForUser(userId: string): Promise<Array<{
    id: string;
    name: string;
    address: string | null;
    status: SiteStatus;
    stasisScore: number;
    confidence: "HIGH" | "MEDIUM" | "LOW";
    lastEvaluatedAt: Date | null;
  }>> {
    const rows = await this.db.site.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        address: true,
        status: true,
        stasisScore: true,
        confidence: true,
        lastEvaluatedAt: true,
      },
    });
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      address: r.address ?? null,
      status: fromDbStatus(r.status) ?? "DATA_GAP",
      stasisScore: r.stasisScore,
      confidence: r.confidence as "HIGH" | "MEDIUM" | "LOW",
      lastEvaluatedAt: r.lastEvaluatedAt ?? null,
    }));
  }

  /** API: sites matching a loan number (CRM lookups, e.g. a Salesforce LWC on a loan record). */
  async findSitesByLoanNumber(
    userId: string,
    loanNumber: string,
  ): Promise<
    Array<{
      id: string;
      name: string;
      address: string | null;
      status: SiteStatus;
      stasisScore: number;
      confidence: "HIGH" | "MEDIUM" | "LOW";
      lastEvaluatedAt: Date | null;
    }>
  > {
    const rows = await this.db.site.findMany({
      where: { userId, loanNumber },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, address: true, status: true, stasisScore: true, confidence: true, lastEvaluatedAt: true },
    });
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      address: r.address ?? null,
      status: fromDbStatus(r.status) ?? "DATA_GAP",
      stasisScore: r.stasisScore,
      confidence: r.confidence as "HIGH" | "MEDIUM" | "LOW",
      lastEvaluatedAt: r.lastEvaluatedAt ?? null,
    }));
  }

  /** API read: one site owned by the user, full detail. Null if not theirs. */
  async getSiteForUser(
    userId: string,
    siteId: string,
  ): Promise<{
    id: string;
    name: string;
    address: string | null;
    status: SiteStatus;
    stasisScore: number;
    confidence: "HIGH" | "MEDIUM" | "LOW";
    lastEvaluatedAt: Date | null;
    latitude: number | null;
    longitude: number | null;
    areaAcres: number | null;
    loanAmount: number | null;
    loanNumber: string | null;
    constructionStart: Date | null;
    constructionEnd: Date | null;
    drawIntelligence: boolean;
    createdAt: Date;
    updatedAt: Date;
  } | null> {
    const s = await this.db.site.findFirst({
      where: { id: siteId, userId },
      select: {
        id: true, name: true, address: true, latitude: true, longitude: true,
        areaAcres: true, loanAmount: true, loanNumber: true,
        constructionStart: true, constructionEnd: true, status: true,
        stasisScore: true, confidence: true, drawIntelligence: true,
        lastEvaluatedAt: true, createdAt: true, updatedAt: true,
      },
    });
    if (!s) return null;
    return {
      id: s.id,
      name: s.name,
      address: s.address ?? null,
      status: fromDbStatus(s.status) ?? "DATA_GAP",
      stasisScore: s.stasisScore,
      confidence: s.confidence as "HIGH" | "MEDIUM" | "LOW",
      lastEvaluatedAt: s.lastEvaluatedAt ?? null,
      latitude: s.latitude ?? null,
      longitude: s.longitude ?? null,
      areaAcres: s.areaAcres ?? null,
      loanAmount: s.loanAmount == null ? null : Number(s.loanAmount),
      loanNumber: s.loanNumber ?? null,
      constructionStart: s.constructionStart ?? null,
      constructionEnd: s.constructionEnd ?? null,
      drawIntelligence: Boolean(s.drawIntelligence),
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    };
  }

  /** API read: paginated observation history for a site the user owns. */
  async getObservationsForSite(
    userId: string,
    siteId: string,
    opts: { limit: number; cursor?: string },
  ): Promise<{
    siteExists: boolean;
    items: Array<{
      id: string;
      observationDate: Date;
      provider: string;
      providerObservationId: string;
      cloudPercent: number | null;
      usablePixelPercent: number | null;
      qualityStatus: string;
      imageryUrl: string | null;
      createdAt: Date;
      metrics: {
        meanNdvi: number | null;
        medianNdvi: number | null;
        meanNdbi: number | null;
        medianNdbi: number | null;
        meanBsi: number | null;
        medianBsi: number | null;
        siteChangePercent: number | null;
        changeVelocity: number | null;
        baselineDeviation: number | null;
        confidence: "HIGH" | "MEDIUM" | "LOW";
      } | null;
    }>;
    nextCursor: string | null;
  }> {
    const site = await this.db.site.findFirst({ where: { id: siteId, userId }, select: { id: true } });
    if (!site) return { siteExists: false, items: [], nextCursor: null };
    const take = Math.min(Math.max(opts.limit, 1), 100);
    const rows = await this.db.siteObservation.findMany({
      where: { siteId },
      orderBy: [{ observationDate: "desc" }, { id: "desc" }],
      ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
      take: take + 1,
      select: {
        id: true, observationDate: true, provider: true, providerObservationId: true,
        cloudPercent: true, usablePixelPercent: true, qualityStatus: true,
        imageryUrl: true, createdAt: true,
        metrics: {
          select: {
            meanNdvi: true, medianNdvi: true, meanNdbi: true, medianNdbi: true,
            meanBsi: true, medianBsi: true, siteChangePercent: true,
            changeVelocity: true, baselineDeviation: true, confidence: true,
          },
        },
      },
    });
    const hasMore = rows.length > take;
    const page = hasMore ? rows.slice(0, take) : rows;
    const items = page.map((o) => ({
      id: o.id,
      observationDate: o.observationDate,
      provider: o.provider,
      providerObservationId: o.providerObservationId,
      cloudPercent: o.cloudPercent ?? null,
      usablePixelPercent: o.usablePixelPercent ?? null,
      qualityStatus: o.qualityStatus,
      imageryUrl: o.imageryUrl ?? null,
      createdAt: o.createdAt,
      metrics: o.metrics
        ? {
            meanNdvi: o.metrics.meanNdvi ?? null,
            medianNdvi: o.metrics.medianNdvi ?? null,
            meanNdbi: o.metrics.meanNdbi ?? null,
            medianNdbi: o.metrics.medianNdbi ?? null,
            meanBsi: o.metrics.meanBsi ?? null,
            medianBsi: o.metrics.medianBsi ?? null,
            siteChangePercent: o.metrics.siteChangePercent ?? null,
            changeVelocity: o.metrics.changeVelocity ?? null,
            baselineDeviation: o.metrics.baselineDeviation ?? null,
            confidence: o.metrics.confidence as "HIGH" | "MEDIUM" | "LOW",
          }
        : null,
    }));
    const last = page[page.length - 1];
    return { siteExists: true, items, nextCursor: hasMore && last ? last.id : null };
  }

  /** API read: a one-off check, owned via email match (checks carry no userId). */
  async getSiteCheckForUser(
    userId: string,
    checkId: string,
  ): Promise<{
    id: string;
    paid: boolean;
    siteName: string | null;
    address: string | null;
    status: SiteStatus | null;
    stasisScore: number | null;
    confidence: "HIGH" | "MEDIUM" | "LOW" | null;
    provider: string | null;
    analyzedAt: Date | null;
    createdAt: Date;
  } | null> {
    const user = await this.db.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (!user?.email) return null;
    const c = await this.db.siteCheck.findUnique({
      where: { id: checkId },
      select: {
        id: true, email: true, paid: true, siteName: true, address: true,
        status: true, stasisScore: true, confidence: true, provider: true,
        analyzedAt: true, createdAt: true,
      },
    });
    if (!c || c.email.toLowerCase() !== user.email.toLowerCase()) return null;
    return {
      id: c.id,
      paid: c.paid,
      siteName: c.siteName ?? null,
      address: c.address ?? null,
      status: c.status ? fromDbStatus(c.status) : null,
      stasisScore: c.stasisScore ?? null,
      confidence: (c.confidence as "HIGH" | "MEDIUM" | "LOW" | null) ?? null,
      provider: c.provider ?? null,
      analyzedAt: c.analyzedAt ?? null,
      createdAt: c.createdAt,
    };
  }
}

/** Returns a repository bound to the Prisma singleton, or null when no DB. */
export function getSiteRepository(): SiteRepository | null {
  if (!isDatabaseConfigured()) return null;
  return new SiteRepository(getPrisma());
}
