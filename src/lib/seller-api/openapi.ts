/** OpenAPI 3.1 document generated from Platform API docs catalog. */

import {
  DOC_ENDPOINTS,
  DOC_ERRORS,
  type DocEndpoint,
} from "@/lib/seller-api/docs-catalog";

export function buildOpenApiDocument(baseUrl: string): Record<string, unknown> {
  const servers = [{ url: baseUrl.replace(/\/$/, "") }];
  const paths: Record<string, Record<string, unknown>> = {};

  for (const ep of DOC_ENDPOINTS) {
    const pathKey = toOpenApiPath(ep.path);
    const op = buildOperation(ep);
    if (!paths[pathKey]) paths[pathKey] = {};
    const method = ep.method.toLowerCase();
    // GET /orders and POST /orders share a path — merge methods.
    paths[pathKey]![method] = op;
  }

  return {
    openapi: "3.1.0",
    info: {
      title: "Cheap Seller Platform API",
      version: "1.0.0",
      description:
        "Flat SKU catalog, role-tier pricing, wallet checkout. Money is USD microcents (1 USD = 100_000_000). POST /orders requires Idempotency-Key. Never send client price.",
    },
    servers,
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "drip_sk_live_… / drip_sk_test_…",
          description: "Create or rotate at /app/development (multiple keys per account, limit set by admin; default 5).",
        },
      },
      schemas: {
        Error: {
          type: "object",
          required: ["error"],
          properties: {
            error: {
              type: "object",
              required: ["code", "message"],
              properties: {
                code: { type: "string" },
                message: { type: "string" },
              },
            },
          },
        },
      },
    },
    paths,
    tags: [
      { name: "products" },
      { name: "wallet" },
      { name: "orders" },
    ],
    "x-drip-errors": DOC_ERRORS,
  };
}

function toOpenApiPath(path: string): string {
  return path.replace(/\{(\w+)\}/g, "{$1}");
}

function buildOperation(ep: DocEndpoint): Record<string, unknown> {
  const parameters: Record<string, unknown>[] = [];

  if (ep.params) {
    for (const p of ep.params) {
      const inPath = ep.path.includes(`{${p.name}}`);
      parameters.push({
        name: p.name,
        in: inPath ? "path" : "query",
        required: inPath ? true : p.required,
        description: p.description,
        schema: { type: p.type === "integer" ? "integer" : "string" },
      });
    }
  }

  if (ep.headers) {
    for (const h of ep.headers) {
      if (h.name.toLowerCase() === "authorization") continue;
      parameters.push({
        name: h.name,
        in: "header",
        required: h.required,
        description: h.description,
        schema: { type: "string" },
      });
    }
  }

  const responses: Record<string, unknown> = {
    "200": {
      description: "Success",
      content: {
        "application/json": {
          example: ep.exampleResponse,
        },
      },
    },
  };

  if (ep.exampleError && ep.statuses) {
    for (const s of ep.statuses) {
      if (s.http === 200) continue;
      const key = String(s.http);
      if (!responses[key]) {
        responses[key] = {
          description: s.when,
          content: {
            "application/json": {
              example: ep.exampleError,
              schema: { $ref: "#/components/schemas/Error" },
            },
          },
        };
      }
    }
  }

  const op: Record<string, unknown> = {
    operationId: ep.id,
    summary: ep.summary,
    tags: [ep.group],
    parameters,
    responses,
  };

  if (ep.auth === "private") {
    op.security = [{ bearerAuth: [] }];
  }

  if (ep.warnings?.length) {
    op.description = ep.warnings.map((w) => `- ${w}`).join("\n");
  }

  if (ep.method === "POST" && (ep.body || ep.bodyParams)) {
    op.requestBody = {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: Object.fromEntries(
              (ep.bodyParams ?? []).map((b) => [
                b.name,
                {
                  type: b.type === "integer" ? "integer" : "string",
                  description: b.description,
                },
              ]),
            ),
            required: (ep.bodyParams ?? [])
              .filter((b) => b.required)
              .map((b) => b.name),
          },
          example: ep.body ?? ep.exampleRequest?.body,
        },
      },
    };
  }

  return op;
}
