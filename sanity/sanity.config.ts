import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'   // optional
import {visionTool} from '@sanity/vision'
import schemaTypes from './schemaTypes'          // default export

export default defineConfig({
  name: 'default',
  title: 'Cypressdale HOA CMS',
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  basePath: '/studio',
  plugins: [structureTool(), visionTool()],      // or just [visionTool()]
  schema: { types: schemaTypes },
})
