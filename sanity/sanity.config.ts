// sanity.config.ts
import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import schemaTypes from './schemaTypes'
import {deskStructure} from './deskStructure'

export default defineConfig({
  name: 'default',
  title: 'Cypressdale HOA CMS',
  projectId: 'nqd1f8zq',
  dataset: 'production',
  basePath: '/',

  plugins: [
    // you can keep your custom desk structure, we’ll update it later
    structureTool({structure: deskStructure}),
    visionTool(),
  ],

  // ✅ schema is just your types now – no templates needed
  schema: {
    types: schemaTypes,
  },

  // ✅ no special document actions – use the normal delete, etc.
  document: {
    actions: (prev) => prev,
  },
})
