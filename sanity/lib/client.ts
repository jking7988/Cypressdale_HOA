// lib/sanity.client.ts (or wherever this file lives)
import { createClient } from "next-sanity";
import { apiVersion, dataset, projectId } from "../env";

export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: true,
});

export const previewClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false,
  token: process.env.SANITY_API_READ_TOKEN, // ✅ required for drafts
  perspective: "previewDrafts",            // ✅ makes drafts appear in list pages
});
