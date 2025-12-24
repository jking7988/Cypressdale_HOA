// sanity/sanity.config.ts
// @ts-nocheck

import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { visionTool } from "@sanity/vision";
import schemaTypes from "./schemaTypes";
import { deskStructure } from "./deskStructure";
import { teamChatTool } from "./teamChatTool";
import { colorInput } from "@sanity/color-input";

// ✅ ADD THIS
import { presentationTool } from "sanity/presentation";

const frontendHost =
  process.env.NEXT_PUBLIC_PREVIEW_URL ||
  "https://cypressdale-hoa.vercel.app";

const SANITY_PREVIEW_SECRET =
  process.env.SANITY_PREVIEW_SECRET ||
  "8f4b1e3c-2f4f-4f6d-9f6e-5e3d6c7b8a9b";

// ✅ Map doc → frontend route
function resolvePreviewPath(doc: any) {
  const id = (doc?._id || "").replace(/^drafts\./, "");
  const type = doc?._type;

  if (type === "post") return `/news/${id}`;
  if (type === "event") return `/events/${id}`;
  if (type === "holidayWinner") return `/holiday-decorating`;

  // fallback
  return "/";
}

export default defineConfig({
  name: "default",
  title: "Cypressdale HOA CMS",
  projectId: "nqd1f8zq",
  dataset: "production",
  basePath: "/",

  plugins: [
    structureTool({
      structure: deskStructure,
    }),
    visionTool(),
    teamChatTool(),
    colorInput(),

    // ✅ Presentation tool (live preview)
    presentationTool({
      previewUrl: {
        origin: frontendHost,
        previewMode: {
          enable: `/api/draft-mode/enable?secret=${SANITY_PREVIEW_SECRET}`,
          disable: "/api/draft-mode/disable",
        },
      },
    }),
  ],

  schema: {
    types: schemaTypes,
  },

  document: {
    actions: (prev) => prev,
  },
});
