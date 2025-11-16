import {defineConfig} from 'sanity';
import {structureTool} from 'sanity/structure';
import {visionTool} from '@sanity/vision';
import schemaTypes from './schemaTypes';
import {deskStructure} from './deskStructure';
import {teamChatTool} from './teamChatTool';

export default defineConfig({
  name: 'default',
  title: 'Cypressdale HOA CMS',
  projectId: 'nqd1f8zq',
  dataset: 'production',
  basePath: '/',

  plugins: [
    structureTool({structure: deskStructure}),
    visionTool(),
    teamChatTool(), // ✅ Team Chat appears as a separate tool
  ],

  schema: {
    types: schemaTypes,
  },

  document: {
    actions: (prev) => prev,
  },
});
