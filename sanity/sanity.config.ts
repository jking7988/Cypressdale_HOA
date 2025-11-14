// sanity.config.ts
import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import schemaTypes from './schemaTypes'
import {deskStructure} from './deskStructure' // ⬅️ add this

export default defineConfig({
  name: 'default',
  title: 'Cypressdale HOA CMS',
  projectId: 'nqd1f8zq',
  dataset: 'production',
  basePath: '/',

  plugins: [
    structureTool({
      structure: deskStructure, // ⬅️ use our custom structure
    }),
    visionTool(),
  ],

  schema: {
    types: schemaTypes,
  },
})
