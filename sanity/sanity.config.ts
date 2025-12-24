// sanity/sanity.config.ts
// @ts-nocheck

import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { visionTool } from "@sanity/vision";
import schemaTypes from "./schemaTypes";
import { deskStructure } from "./deskStructure";
import { teamChatTool } from "./teamChatTool";
import { colorInput } from "@sanity/color-input";
import { presentationTool } from "sanity/presentation";

const frontendHost =
  process.env.NEXT_PUBLIC_PREVIEW_URL ||
  "https://cypressdale-hoa.vercel.app";

const SANITY_PREVIEW_SECRET =
  process.env.SANITY_PREVIEW_SECRET ||
  "8f4b1e3c-2f4f-4f6d-9f6e-5e3d6c7b8a9b";

function baseId(doc: any) {
  const id = doc?._id || "";
  return id.startsWith("drafts.") ? id.slice(7) : id;
}

export default defineConfig({
  name: "default",
  title: "Cypressdale HOA CMS",
  projectId: "nqd1f8zq",
  dataset: "production",
  basePath: "/",

  plugins: [
    structureTool({ structure: deskStructure }),
    visionTool(),
    teamChatTool(),
    colorInput(),

    presentationTool({
      previewUrl: {
        origin: frontendHost,
        previewMode: {
          enable: `/api/draft-mode/enable?secret=${SANITY_PREVIEW_SECRET}`,
          disable: `/api/draft-mode/disable`,
        },
      },

      // ✅ This is what populates “Documents on this page” for non-[id] pages
      locate: (doc: any) => {
        const id = baseId(doc);
        const type = doc?._type;

        if (type === "post") {
          return [
            { title: "News list", href: "/news" },
            { title: `News: ${doc?.title || id}`, href: `/news/${id}` },
          ];
        }

        if (type === "event") {
          return [
            { title: "Events list", href: "/events" },
            { title: `Event: ${doc?.title || id}`, href: `/events/${id}` },
          ];
        }

        if (type === "holidayWinner") {
          // Aggregate page – this is the key one
          return [{ title: "Holiday Decorating", href: "/holiday-decorating" }];
        }

        if (type === "yardWinner") {
          return [{ title: "Yard of the Month", href: "/yard-of-the-month" }];
        }

        if (type === "documentFile" || type === "documentFolder") {
          return [{ title: "Documents", href: "/documents" }];
        }

        return [{ title: "Home", href: "/" }];
      },
    }),
  ],

  schema: { types: schemaTypes },
  document: { actions: (prev) => prev },
});
