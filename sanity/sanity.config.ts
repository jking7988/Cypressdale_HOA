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
    structureTool({structure: deskStructure}),
    visionTool(),
  ],

  schema: {
  types: schemaTypes,

  templates: (prev) => [
    ...prev,

    // Create a SUBFOLDER with parent auto-set
    {
      id: 'subfolderInFolder',
      title: 'Document Folder',
      schemaType: 'documentFolder',
      parameters: [{name: 'parentId', type: 'string'}],
      value: (params: any) =>
        params?.parentId
          ? {
              parent: {
                _type: 'reference',
                _ref: params.parentId,
              },
            }
          : {},
    },

    // Create a FILE with folder auto-set
    {
      id: 'fileInFolder',
      title: 'Document (PDF, etc.)',
      schemaType: 'documentFile',
      parameters: [{name: 'folderId', type: 'string'}],
      value: (params: any) =>
        params?.folderId
          ? {
              folder: {
                _type: 'reference',
                _ref: params.folderId,
              },
            }
          : {},
    },
  ],
},

  // ✅ keep your cascade delete for folders
  document: {
    actions: (prev, context) => {
      if (context.schemaType !== 'documentFolder') {
        // leave all other docs alone
        return prev
      }

      const client = context.getClient({apiVersion: '2023-01-01'})

      const deleteFolderWithContents = (props: any) => {
        let isRunning = false
        const {id} = props

        return {
          label: isRunning ? 'Deleting…' : 'Delete folder + contents',
          tone: 'critical' as const,
          disabled: isRunning,
          onHandle: async () => {
            if (isRunning) return

            const confirmed = window.confirm(
              'This will permanently delete this folder AND all subfolders and files inside it. Are you sure?'
            )
            if (!confirmed) {
              props.onComplete()
              return
            }

            try {
              isRunning = true

              // 1. Get ALL folders with their parent reference
              const folders: {_id: string; parentId?: string}[] =
                await client.fetch(
                  `*[_type == "documentFolder"]{ _id, "parentId": parent._ref }`
                )

              // 2. Compute all descendant folder IDs (including this one)
              const toDeleteFolderIds = new Set<string>()
              const stack = [id as string]

              while (stack.length) {
                const current = stack.pop()!
                if (!toDeleteFolderIds.has(current)) {
                  toDeleteFolderIds.add(current)
                  for (const f of folders) {
                    if (f.parentId === current) {
                      stack.push(f._id)
                    }
                  }
                }
              }

              const folderIdsArray = Array.from(toDeleteFolderIds)

              // 3. Get all files whose folder is any of those IDs
              const fileIds: string[] = await client.fetch(
                `*[_type == "documentFile" && folder._ref in $folderIds][]._id`,
                {folderIds: folderIdsArray}
              )

              // 4. Delete everything in a single transaction
              const tx = client.transaction()
              folderIdsArray.forEach((folderId) => tx.delete(folderId))
              fileIds.forEach((fileId) => tx.delete(fileId))

              await tx.commit()

              alert(
                `Deleted ${folderIdsArray.length} folder(s) and ${fileIds.length} file(s).`
              )
            } catch (err) {
              console.error(err)
              alert(
                'Failed to delete folder + contents. Check the console for details.'
              )
            } finally {
              isRunning = false
              props.onComplete()
            }
          },
        }
      }

      // For folders: keep everything except the built-in "delete",
      // then add our cascade delete action
      return [
        ...prev.filter((action) => action.action !== 'delete'),
        deleteFolderWithContents as any,
      ]
    },
  },
})
