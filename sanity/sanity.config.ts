// sanity/sanity.config.ts
// @ts-nocheck

import {defineConfig} from 'sanity';
import {structureTool} from 'sanity/structure';
import {visionTool} from '@sanity/vision';
import schemaTypes from './schemaTypes';
import {deskStructure} from './deskStructure';
import {teamChatTool} from './teamChatTool';
import {Iframe} from 'sanity-plugin-iframe-pane';
import {colorInput} from '@sanity/color-input'; 

const frontendHost =
  process.env.NEXT_PUBLIC_PREVIEW_URL ||
  'https://cypressdale-hoa.vercel.app';

// 👇 use this consistently
const SANITY_PREVIEW_SECRET =
  process.env.SANITY_PREVIEW_SECRET ||
  '8f4b1e3c-2f4f-4f6d-9f6e-5e3d6c7b8a9b';

function getBaseId(doc: any) {
  const id = doc?._id || '';
  return id.startsWith('drafts.') ? id.slice(7) : id;
}

function resolvePostPreviewUrl(doc: any) {
  const baseId = getBaseId(doc);
  if (!baseId) return `${frontendHost}/news`;
  const rev = doc?._rev ? `&rev=${doc._rev}` : '';
  return `${frontendHost}/api/preview?secret=${SANITY_PREVIEW_SECRET}&type=post&id=${baseId}${rev}`;
}

function resolveEventPreviewUrl(doc: any) {
  const baseId = getBaseId(doc);
  if (!baseId) return `${frontendHost}/events`;
  const rev = doc?._rev ? `&rev=${doc._rev}` : '';
  return `${frontendHost}/api/preview?secret=${SANITY_PREVIEW_SECRET}&type=event&id=${baseId}${rev}`;
}

const defaultDocumentNode = (S: any, { schemaType }: { schemaType: string }) => {
  if (schemaType === 'post') {
    return S.document().views([
      S.view.form(),
      S.view
        .component(Iframe)
        .options({
          url: (doc: any) => resolvePostPreviewUrl(doc),
          reload: { button: true }, // keep the button as backup
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
          reload: { button: true },
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
    colorInput(),
  ],

  schema: {
    types: schemaTypes,
  },

  document: {
    actions: (prev) => prev,
  },
});
