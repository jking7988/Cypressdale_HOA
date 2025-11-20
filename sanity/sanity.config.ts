// sanity/sanity.config.ts
// @ts-nocheck

import {defineConfig} from 'sanity';
import {structureTool} from 'sanity/structure';
import {visionTool} from '@sanity/vision';
import schemaTypes from './schemaTypes';
import {deskStructure} from './deskStructure';
import {teamChatTool} from './teamChatTool';
import {Iframe} from 'sanity-plugin-iframe-pane';

const frontendHost = 'https://www.cypressdalehoa.com';
const PREVIEW_SECRET = '8f4b1e3c-2f4f-4f6d-9f6e-5e3d6c7b8a9b'; // same as URL you showed

function getBaseId(doc: any) {
  const id = doc?._id || '';
  return id.startsWith('drafts.') ? id.slice(7) : id;
}

function resolvePostPreviewUrl(doc: any) {
  const baseId = getBaseId(doc);
  if (!baseId) return `${frontendHost}/news`;
  return `${frontendHost}/api/preview?secret=${PREVIEW_SECRET}&type=post&id=${baseId}`;
}

function resolveEventPreviewUrl(doc: any) {
  const baseId = getBaseId(doc);
  if (!baseId) return `${frontendHost}/events`;
  return `${frontendHost}/api/preview?secret=${PREVIEW_SECRET}&type=event&id=${baseId}`;
}

const defaultDocumentNode = (S: any, {schemaType}: {schemaType: string}) => {
  if (schemaType === 'post') {
    return S.document().views([
      S.view.form(),
      S.view
        .component(Iframe)
        .options({
          url: (doc: any) => resolvePostPreviewUrl(doc),
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
          url: (doc: any) => resolveEventPreviewUrl(doc),
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
