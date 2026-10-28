// API v1 response serializers. PURE (no Prisma/Next) so the wire contract is
// unit-tested in isolation. Repository methods return camelCase domain objects;
// these map them to the snake_case JSON the public API exposes. Keeping this in
// one place means the contract can't drift endpoint-to-endpoint.

export interface SiteSummaryInput {
  id: string;
  name: string;
  address: string | null;
  status: string;
  stasisScore: number;
  confidence: string;
  lastEvaluatedAt: Date | null;
}

export interface SiteDetailInput extends SiteSummaryInput {
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
}

export interface MetricsInput {
  meanNdvi: number | null;
  medianNdvi: number | null;
  meanNdbi: number | null;
  medianNdbi: number | null;
  meanBsi: number | null;
  medianBsi: number | null;
  siteChangePercent: number | null;
  changeVelocity: number | null;
  baselineDeviation: number | null;
  confidence: string;
}

export interface ObservationInput {
  id: string;
  observationDate: Date;
  provider: string;
  providerObservationId: string;
  cloudPercent: number | null;
  usablePixelPercent: number | null;
  qualityStatus: string;
  imageryUrl: string | null;
  createdAt: Date;
  metrics: MetricsInput | null;
}

export interface CheckInput {
  id: string;
  paid: boolean;
  siteName: string | null;
  address: string | null;
  status: string | null;
  stasisScore: number | null;
  confidence: string | null;
  provider: string | null;
  analyzedAt: Date | null;
  createdAt: Date;
}

const iso = (d: Date | null): string | null => (d ? d.toISOString() : null);

export function serializeSiteSummary(s: SiteSummaryInput) {
  return {
    id: s.id,
    name: s.name,
    address: s.address,
    status: s.status,
    stasis_score: s.stasisScore,
    confidence: s.confidence,
    last_evaluated_at: iso(s.lastEvaluatedAt),
  };
}

export function serializeSiteDetail(s: SiteDetailInput) {
  return {
    id: s.id,
    name: s.name,
    address: s.address,
    latitude: s.latitude,
    longitude: s.longitude,
    area_acres: s.areaAcres,
    loan_amount: s.loanAmount,
    loan_number: s.loanNumber,
    construction_start: iso(s.constructionStart),
    construction_end: iso(s.constructionEnd),
    status: s.status,
    stasis_score: s.stasisScore,
    confidence: s.confidence,
    draw_intelligence: s.drawIntelligence,
    last_evaluated_at: iso(s.lastEvaluatedAt),
    created_at: s.createdAt.toISOString(),
    updated_at: s.updatedAt.toISOString(),
  };
}

export function serializeObservation(o: ObservationInput) {
  return {
    id: o.id,
    observation_date: o.observationDate.toISOString(),
    provider: o.provider,
    provider_observation_id: o.providerObservationId,
    cloud_percent: o.cloudPercent,
    usable_pixel_percent: o.usablePixelPercent,
    quality_status: o.qualityStatus,
    imagery_url: o.imageryUrl,
    created_at: o.createdAt.toISOString(),
    metrics: o.metrics
      ? {
          mean_ndvi: o.metrics.meanNdvi,
          median_ndvi: o.metrics.medianNdvi,
          mean_ndbi: o.metrics.meanNdbi,
          median_ndbi: o.metrics.medianNdbi,
          mean_bsi: o.metrics.meanBsi,
          median_bsi: o.metrics.medianBsi,
          site_change_percent: o.metrics.siteChangePercent,
          change_velocity: o.metrics.changeVelocity,
          baseline_deviation: o.metrics.baselineDeviation,
          confidence: o.metrics.confidence,
        }
      : null,
  };
}

export function serializeCheck(c: CheckInput) {
  return {
    id: c.id,
    paid: c.paid,
    site_name: c.siteName,
    address: c.address,
    status: c.status,
    stasis_score: c.stasisScore,
    confidence: c.confidence,
    provider: c.provider,
    analyzed_at: iso(c.analyzedAt),
    created_at: c.createdAt.toISOString(),
  };
}

// Clamp a user-supplied ?limit= into [1, max], falling back to `def`.
export function parseLimit(raw: string | null, def: number, max: number): number {
  const n = raw == null ? def : Number(raw);
  if (!Number.isFinite(n)) return def;
  return Math.min(Math.max(Math.trunc(n), 1), max);
}
