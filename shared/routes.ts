import { z } from 'zod';
import { insertCandidateSchema, candidates, userSubscriptions } from './schema';

// Shared Error Schemas
export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
  forbidden: z.object({
    message: z.string(),
  })
};

// API Contract
export const api = {
  candidates: {
    list: {
      method: 'GET' as const,
      path: '/api/candidates',
      responses: {
        200: z.array(z.custom<typeof candidates.$inferSelect>()),
        401: errorSchemas.unauthorized,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/candidates/:id',
      responses: {
        200: z.custom<typeof candidates.$inferSelect>(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/candidates',
      input: insertCandidateSchema.extend({
        resumeFile: z.any().optional(), // For multipart/form-data
      }),
      responses: {
        201: z.custom<typeof candidates.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
        403: errorSchemas.forbidden, // Plan limit reached
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/candidates/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
  },
  subscription: {
    get: {
      method: 'GET' as const,
      path: '/api/subscription',
      responses: {
        200: z.custom<typeof userSubscriptions.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
    update: {
      method: 'POST' as const,
      path: '/api/subscription/upgrade',
      input: z.object({
        plan: z.enum(['free', 'pro', 'enterprise']),
      }),
      responses: {
        200: z.custom<typeof userSubscriptions.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type CandidateInput = z.infer<typeof api.candidates.create.input>;
