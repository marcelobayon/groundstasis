"use strict";

// Ground Stasis — Zapier integration.
// REST Hook triggers backed by the Ground Stasis webhook system: a Zap turning
// on calls performSubscribe (POST /api/v1/webhooks) to register Zapier's target
// URL; our delivery worker then POSTs signed events straight into the Zap.
// Auth is an API key (webhooks:manage + sites:read scopes) created at
// https://groundstasis.com/account.

const BASE = "https://groundstasis.com/api/v1";

// Inject the API key on every request.
const addApiKey = (request, z, bundle) => {
  if (bundle.authData && bundle.authData.api_key) {
    request.headers = request.headers || {};
    request.headers.Authorization = `Bearer ${bundle.authData.api_key}`;
  }
  return request;
};

// Turn Ground Stasis error envelopes into clear Zapier errors.
const handleErrors = (response, z) => {
  if (response.status === 401) {
    throw new z.errors.Error("Invalid or revoked API key.", "AuthenticationError", 401);
  }
  if (response.status === 403) {
    throw new z.errors.Error("This API key is missing a required scope (webhooks:manage).", "ForbiddenError", 403);
  }
  if (response.status === 429) {
    throw new z.errors.Error("Rate limit exceeded — try again shortly.", "ThrottledError", 429);
  }
  return response;
};

const authentication = {
  type: "custom",
  fields: [
    {
      key: "api_key",
      label: "API Key",
      required: true,
      type: "string",
      helpText:
        "Create a key at https://groundstasis.com/account (Developer → API keys) with the **webhooks:manage** and **sites:read** scopes.",
    },
  ],
  test: { url: `${BASE}/me`, method: "GET" },
  connectionLabel: "Ground Stasis ({{data.account_id}})",
};

const EVENTS = {
  observation: {
    event: "observation.available",
    noun: "Observation",
    label: "New Observation",
    desc: "Triggers when a new satellite observation is processed for one of your sites.",
  },
  stasis: {
    event: "stasis.detected",
    noun: "Stasis Alert",
    label: "Stasis Detected",
    desc: "Triggers when a site transitions into stasis (sustained lack of construction activity).",
  },
  resumed: {
    event: "activity.resumed",
    noun: "Activity Alert",
    label: "Activity Resumed",
    desc: "Triggers when construction activity resumes at a site.",
  },
  dataGap: {
    event: "data_gap.detected",
    noun: "Data Gap",
    label: "Data Gap Detected",
    desc: "Triggers when usable imagery is unavailable and monitoring confidence drops.",
  },
  status: {
    event: "site.status_changed",
    noun: "Status Change",
    label: "Site Status Changed",
    desc: "Triggers when a site's monitoring status changes.",
  },
};

function sampleFor(event) {
  return {
    id: "dlv_sample_0001",
    event,
    created_at: "2026-10-27T12:00:00.000Z",
    data: {
      site_id: "ckv_example",
      site_name: "Lot 7 — Maple Ridge",
      status: event === "activity.resumed" ? "ACTIVE" : "STASIS",
      stasis_score: event === "activity.resumed" ? 78 : 20,
      confidence: "HIGH",
      observed_at: "2026-10-27T06:00:00.000Z",
    },
  };
}

function hookTrigger(key, cfg) {
  const sample = sampleFor(cfg.event);
  return {
    key,
    noun: cfg.noun,
    display: { label: cfg.label, description: cfg.desc },
    operation: {
      type: "hook",
      performSubscribe: async (z, bundle) => {
        const res = await z.request({
          url: `${BASE}/webhooks`,
          method: "POST",
          body: { target_url: bundle.targetUrl, events: [cfg.event] },
        });
        return res.data.data; // { id, url, events }
      },
      performUnsubscribe: async (z, bundle) => {
        const id = bundle.subscribeData && bundle.subscribeData.id;
        if (id) {
          await z.request({ url: `${BASE}/webhooks/${id}`, method: "DELETE" });
        }
        return {};
      },
      // The incoming webhook body is the event envelope; dedupe on `id`.
      perform: (z, bundle) => [bundle.cleanedRequest],
      performList: async () => [sample],
      sample,
      outputFields: [
        { key: "id", label: "Delivery ID" },
        { key: "event", label: "Event" },
        { key: "created_at", label: "Created At" },
        { key: "data__site_id", label: "Site ID" },
        { key: "data__site_name", label: "Site Name" },
        { key: "data__status", label: "Status" },
        { key: "data__stasis_score", label: "Stasis Score", type: "integer" },
        { key: "data__confidence", label: "Confidence" },
        { key: "data__observed_at", label: "Observed At" },
      ],
    },
  };
}

const App = {
  version: require("./package.json").version,
  platformVersion: require("zapier-platform-core").version,
  flags: { cleanInputData: false },
  authentication,
  beforeRequest: [addApiKey],
  afterResponse: [handleErrors],
  triggers: {
    new_observation: hookTrigger("new_observation", EVENTS.observation),
    stasis_detected: hookTrigger("stasis_detected", EVENTS.stasis),
    activity_resumed: hookTrigger("activity_resumed", EVENTS.resumed),
    data_gap: hookTrigger("data_gap", EVENTS.dataGap),
    status_changed: hookTrigger("status_changed", EVENTS.status),
  },
  // Actions (Add Site, Run Check) come in a later increment — they need public
  // write endpoints (sites:write) and a billing decision for metered checks.
  creates: {},
  searches: {},
  resources: {},
};

module.exports = App;
