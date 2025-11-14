// deleteFolderWithContents.ts
import {useState} from 'react'
import {useClient} from 'sanity'
import type {DocumentActionComponent} from 'sanity'

export const deleteFolderWithContents: DocumentActionComponent = (props) => {
  const client = useClient({apiVersion: '2023-01-01'})
  const [isRunning, setIsRunning] = useState(false)

  const {id} = props

  return {
    label: isRunning ? 'Deleting…' : 'Delete folder + contents',
    tone: 'critical',
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
        setIsRunning(true)

        // 1. Get ALL folders with their parent references
        const folders: { _id: string; parentId?: string }[] =
          await client.fetch(
            `*[_type == "documentFolder"]{ _id, "parentId": parent._ref }`
          )

        // 2. Work out all descendant folder IDs of the folder being deleted
        const toDeleteFolderIds = new Set<string>()
        const stack = [id]

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

        // 3. Find all files that live in any of those folders
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
        alert('Failed to delete folder + contents. Check console for details.')
      } finally {
        setIsRunning(false)
        props.onComplete()
      }
    },
  }
}
