// sanity.config.ts
import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import schemaTypes from './schemaTypes'
import {deskStructure} from './deskStructure'
import {deleteFolderWithContents} from './deleteFolderWithContents'   // ⬅️ new

export default defineConfig({
  name: 'default',
  title: 'Cypressdale HOA CMS',
  projectId: 'nqd1f8zq',
  dataset: 'production',
  basePath: '/',

  plugins: [
    structureTool({structure: deskStructure}),
    visionTool(),
  ],

  schema: {
    types: schemaTypes,
  },

  // ⬇️ NEW: customize actions for folder docs
  document: {
    actions: (prev, context) => {
      if (context.schemaType === 'documentFolder') {
        return [
          // keep all default actions EXCEPT the built-in "delete"
          ...prev.filter((action) => action.action !== 'delete'),
          // add our cascade delete
          deleteFolderWithContents,
        ]
      }
      return prev
    },
  },
})
