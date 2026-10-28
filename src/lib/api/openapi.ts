// OpenAPI 3.1 description of the Ground Stasis API v1. Served verbatim at
// /api/v1/openapi.json and used to drive the human docs page. Kept in sync by
// hand (small surface); openapi.test.ts guards that every live path is listed.

const ErrorResponse = {
  description: "Error",
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/Error" },
    },
  },
};

export const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "Ground Stasis API",
    version: "1.0.0",
    description:
      "Read access to your Ground Stasis monitoring data: sites, their satellite observation history, and one-off activity-check results. Authenticate with an API key created in your account dashboard.",
  },
  servers: [{ url: "https://groundstasis.com/api/v1" }],
  security: [{ bearerAuth: [] }],
  tags: [
    { name: "Sites", description: "Monitored construction sites and their observation history." },
    { name: "Checks", description: "One-off activity checks." },
    { name: "Usage", description: "Your API usage and rate-limit headroom." },
  ],
  paths: {
    "/sites": {
      get: {
        tags: ["Sites"],
        summary: "List sites",
        description: "Every site owned by the authenticated key's account. Requires the `sites:read` scope.",
        operationId: "listSites",
        parameters: [
          {
            name: "loan_number",
            in: "query",
            required: false,
            description: "Filter to sites with this loan number (CRM lookups, e.g. a Salesforce record).",
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "A list of site summaries.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: { type: "array", items: { $ref: "#/components/schemas/SiteSummary" } },
                  },
                },
              },
            },
          },
          "401": ErrorResponse,
          "403": ErrorResponse,
          "429": ErrorResponse,
        },
      },
    },
    "/sites/{id}": {
      get: {
        tags: ["Sites"],
        summary: "Get a site",
        description: "Full detail for one site you own. Requires the `sites:read` scope.",
        operationId: "getSite",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "The site.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { data: { $ref: "#/components/schemas/SiteDetail" } },
                },
              },
            },
          },
          "401": ErrorResponse,
          "403": ErrorResponse,
          "404": ErrorResponse,
          "429": ErrorResponse,
        },
      },
    },
    "/sites/{id}/observations": {
      get: {
        tags: ["Sites"],
        summary: "List a site's observations",
        description:
          "Paginated satellite observation history for a site, newest first. Pass the returned `next_cursor` as `?cursor=` to page on. Requires the `sites:read` scope.",
        operationId: "listObservations",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
          {
            name: "limit",
            in: "query",
            required: false,
            description: "Page size, 1–100 (default 50).",
            schema: { type: "integer", minimum: 1, maximum: 100, default: 50 },
          },
          {
            name: "cursor",
            in: "query",
            required: false,
            description: "Opaque cursor from a previous response's `next_cursor`.",
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "A page of observations.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: { type: "array", items: { $ref: "#/components/schemas/Observation" } },
                    next_cursor: { type: ["string", "null"] },
                  },
                },
              },
            },
          },
          "401": ErrorResponse,
          "403": ErrorResponse,
          "404": ErrorResponse,
          "429": ErrorResponse,
        },
      },
    },
    "/checks/{id}": {
      get: {
        tags: ["Checks"],
        summary: "Get an activity check",
        description:
          "Result of a one-off activity check. Ownership is matched on the check's email == your account email. Requires the `sites:read` scope.",
        operationId: "getCheck",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "The check.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { data: { $ref: "#/components/schemas/Check" } },
                },
              },
            },
          },
          "401": ErrorResponse,
          "403": ErrorResponse,
          "404": ErrorResponse,
          "429": ErrorResponse,
        },
      },
    },
    "/me": {
      get: {
        tags: ["Account"],
        summary: "Identify the account behind a key",
        description: "Returns the account id and the key's scopes. Any valid key works (no scope required).",
        operationId: "getMe",
        responses: {
          "200": {
            description: "Account identity.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "object",
                      properties: {
                        account_id: { type: "string" },
                        scopes: { type: "array", items: { type: "string" } },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": ErrorResponse,
          "429": ErrorResponse,
        },
      },
    },
    "/webhooks": {
      get: {
        tags: ["Webhooks"],
        summary: "List webhook endpoints",
        description: "Active endpoints for the key's account. Requires `webhooks:manage`.",
        operationId: "listWebhooks",
        responses: {
          "200": {
            description: "Endpoints.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { data: { type: "array", items: { $ref: "#/components/schemas/WebhookEndpoint" } } },
                },
              },
            },
          },
          "401": ErrorResponse,
          "403": ErrorResponse,
          "429": ErrorResponse,
        },
      },
      post: {
        tags: ["Webhooks"],
        summary: "Subscribe a webhook endpoint",
        description:
          "Register an https target URL for events (this is the Zapier REST Hook subscribe call). Requires `webhooks:manage`.",
        operationId: "subscribeWebhook",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["target_url", "events"],
                properties: {
                  target_url: { type: "string", format: "uri" },
                  events: { type: "array", items: { type: "string" } },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Created endpoint.",
            content: {
              "application/json": {
                schema: { type: "object", properties: { data: { $ref: "#/components/schemas/WebhookEndpoint" } } },
              },
            },
          },
          "400": ErrorResponse,
          "401": ErrorResponse,
          "403": ErrorResponse,
          "429": ErrorResponse,
        },
      },
    },
    "/webhooks/{id}": {
      delete: {
        tags: ["Webhooks"],
        summary: "Unsubscribe a webhook endpoint",
        description: "Disable an endpoint (the Zapier REST Hook unsubscribe call). Requires `webhooks:manage`.",
        operationId: "unsubscribeWebhook",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "Deleted.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { data: { type: "object", properties: { deleted: { type: "boolean" } } } },
                },
              },
            },
          },
          "401": ErrorResponse,
          "403": ErrorResponse,
          "404": ErrorResponse,
          "429": ErrorResponse,
        },
      },
    },
    "/usage": {
      get: {
        tags: ["Usage"],
        summary: "Get usage",
        description: "Month-to-date request total and rate-limit headroom. Requires the `usage:read` scope.",
        operationId: "getUsage",
        responses: {
          "200": {
            description: "Usage summary.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    period: { type: "object" },
                    usage: { type: "object" },
                    rate_limit: { type: "object" },
                  },
                },
              },
            },
          },
          "401": ErrorResponse,
          "403": ErrorResponse,
          "429": ErrorResponse,
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        description: "Send your API key as `Authorization: Bearer gs_live_…` (or the `X-API-Key` header).",
      },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          error: {
            type: "object",
            properties: { code: { type: "string" }, message: { type: "string" } },
            required: ["code", "message"],
          },
        },
      },
      SiteSummary: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          address: { type: ["string", "null"] },
          status: { type: "string", enum: ["ACTIVE", "WATCH", "REVIEW", "STASIS", "DATA_GAP", "PAUSED"] },
          stasis_score: { type: "integer" },
          confidence: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"] },
          last_evaluated_at: { type: ["string", "null"], format: "date-time" },
        },
      },
      SiteDetail: {
        allOf: [
          { $ref: "#/components/schemas/SiteSummary" },
          {
            type: "object",
            properties: {
              latitude: { type: ["number", "null"] },
              longitude: { type: ["number", "null"] },
              area_acres: { type: ["number", "null"] },
              loan_amount: { type: ["number", "null"] },
              loan_number: { type: ["string", "null"] },
              construction_start: { type: ["string", "null"], format: "date-time" },
              construction_end: { type: ["string", "null"], format: "date-time" },
              draw_intelligence: { type: "boolean" },
              created_at: { type: "string", format: "date-time" },
              updated_at: { type: "string", format: "date-time" },
            },
          },
        ],
      },
      Metrics: {
        type: "object",
        properties: {
          mean_ndvi: { type: ["number", "null"] },
          median_ndvi: { type: ["number", "null"] },
          mean_ndbi: { type: ["number", "null"] },
          median_ndbi: { type: ["number", "null"] },
          mean_bsi: { type: ["number", "null"] },
          median_bsi: { type: ["number", "null"] },
          site_change_percent: { type: ["number", "null"] },
          change_velocity: { type: ["number", "null"] },
          baseline_deviation: { type: ["number", "null"] },
          confidence: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"] },
        },
      },
      Observation: {
        type: "object",
        properties: {
          id: { type: "string" },
          observation_date: { type: "string", format: "date-time" },
          provider: { type: "string" },
          provider_observation_id: { type: "string" },
          cloud_percent: { type: ["number", "null"] },
          usable_pixel_percent: { type: ["number", "null"] },
          quality_status: { type: "string", enum: ["OK", "LOW_QUALITY"] },
          imagery_url: { type: ["string", "null"] },
          created_at: { type: "string", format: "date-time" },
          metrics: { oneOf: [{ $ref: "#/components/schemas/Metrics" }, { type: "null" }] },
        },
      },
      WebhookEndpoint: {
        type: "object",
        properties: {
          id: { type: "string" },
          url: { type: "string", format: "uri" },
          events: { type: "array", items: { type: "string" } },
          active: { type: "boolean" },
        },
      },
      Check: {
        type: "object",
        properties: {
          id: { type: "string" },
          paid: { type: "boolean" },
          site_name: { type: ["string", "null"] },
          address: { type: ["string", "null"] },
          status: { type: ["string", "null"], enum: ["ACTIVE", "WATCH", "REVIEW", "STASIS", "DATA_GAP", "PAUSED", null] },
          stasis_score: { type: ["integer", "null"] },
          confidence: { type: ["string", "null"], enum: ["HIGH", "MEDIUM", "LOW", null] },
          provider: { type: ["string", "null"] },
          analyzed_at: { type: ["string", "null"], format: "date-time" },
          created_at: { type: "string", format: "date-time" },
        },
      },
    },
  },
} satisfies Record<string, unknown>;
