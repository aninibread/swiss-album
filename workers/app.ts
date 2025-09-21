import { createRequestHandler } from "react-router";
import { handleApiRequest } from "../app/lib/api";

declare module "react-router" {
  export interface AppLoadContext {
    cloudflare: {
      env: {
        DB: D1Database;
        BUCKET: R2Bucket;
        CACHE: KVNamespace;
        REALTIME: KVNamespace;
        MAX_FILE_SIZE: string;
        ALLOWED_IMAGE_TYPES: string;
        ALLOWED_VIDEO_TYPES: string;
        GEOAPIFY_API_KEY?: string;
      };
      ctx: ExecutionContext;
    };
  }
}

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE
);

export default {
  async fetch(request, env, ctx) {
    try {
      // Try to handle API requests first
      const apiResponse = await handleApiRequest(request, env as any);
      if (apiResponse) {
        return apiResponse;
      }

      // Fall back to React Router for regular app routes
      return requestHandler(request, {
        cloudflare: { env, ctx },
      });
    } catch (error) {
      console.error('Worker error:', error);
      return new Response('Internal server error', { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      });
    }
  },
} satisfies ExportedHandler<{
  DB: D1Database;
  BUCKET: R2Bucket;
  CACHE: KVNamespace;
  REALTIME: KVNamespace;
  MAX_FILE_SIZE: string;
  ALLOWED_IMAGE_TYPES: string;
  ALLOWED_VIDEO_TYPES: string;
  GEOAPIFY_API_KEY?: string;
}>;
