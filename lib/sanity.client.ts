// lib/sanity.client.ts
import { createClient } from 'next-sanity';

// Base config
const config = {
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2025-01-01',
};

// 🔹 1. Public client (published content only)
export const client = createClient({
  ...config,
  useCdn: true,
});

// 🔹 2. Preview client (can see drafts)
// Requires SANITY_API_READ_TOKEN env var inside your **Next.js app**
export const previewClient = createClient({
  ...config,
  useCdn: false,
  token: process.env.SANITY_API_READ_TOKEN, // MUST be set in Next app .env
});

// 🔹 3. Helper: choose correct client based on draftMode()
export function getClient(isPreview: boolean) {
  return isPreview ? previewClient : client;
}
