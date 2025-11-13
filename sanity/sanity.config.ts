import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import schemaTypes from './schemaTypes'

export default defineConfig({
  name: 'default',
  title: 'Cypressdale HOA CMS',
  // 🔴 Put your actual Sanity project ID here:
  projectId: 'nqd1f8zq',
  dataset: 'production',
  basePath: '/',

  plugins: [structureTool(), visionTool()],
  schema: {
    types: schemaTypes,
  },
})
