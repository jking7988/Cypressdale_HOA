// sanity/sanity.config.ts
// @ts-nocheck

import {defineConfig} from 'sanity';
import {structureTool} from 'sanity/structure';
import {visionTool} from '@sanity/vision';
import schemaTypes from './schemaTypes';
import {deskStructure} from './deskStructure';
import {teamChatTool} from './teamChatTool';
import {Iframe} from 'sanity-plugin-iframe-pane';

// 👇 Public URL of your Next app (no localhost here)
const frontendHost = 'https://www.cypressdalehoa.com';

// 👇 Same value as SANITY_PREVIEW_SECRET in the Next app
const previewSecret = 'cypressdale-super-secret-123';

function resolvePostPreviewUrl(doc) {
  if (!doc?._id) return `${frontendHost}/news`;
  return `${frontendHost}/api/preview?secret=${previewSecret}&type=post&id=${doc._id}`;
}

function resolveEventPreviewUrl(doc) {
  if (!doc?._id) return `${frontendHost}/events`;
  return `${frontendHost}/api/preview?secret=${previewSecret}&type=event&id=${doc._id}`;
}

const defaultDocumentNode = (S, {schemaType}) => {
  if (schemaType === 'post') {
    return S.document().views([
      S.view.form(),
      S.view
        .component(Iframe)
        .options({
          url: (doc) => resolvePostPreviewUrl(doc),
          reload: {button: true},
        })
        .title('Preview'),
    ]);
  }

  if (schemaType === 'event') {
    return S.document().views([
      S.view.form(),
      S.view
        .component(Iframe)
        .options({
          url: (doc) => resolveEventPreviewUrl(doc),
          reload: {button: true},
        })
        .title('Preview'),
    ]);
  }

  return S.document().views([S.view.form()]);
};

export default defineConfig({
  name: 'default',
  title: 'Cypressdale HOA CMS',
  projectId: 'nqd1f8zq',
  dataset: 'production',
  basePath: '/',

  plugins: [
    structureTool({
      structure: deskStructure,
      defaultDocumentNode,
    }),
    visionTool(),
    teamChatTool(),
  ],

  schema: {
    types: schemaTypes,
  },

  document: {
    actions: (prev) => prev,
  },
});
