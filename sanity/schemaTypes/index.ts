// sanity/schemaTypes/index.ts

import post from './post'
import event from './event'
import documentFile from './documentFile'
import rsvpResponse from './rsvpResponse'
// 👆 add any OTHER schemas you have here, e.g.
// import contact from './contact'
// import boardMember from './boardMember'

// ❌ do NOT import ./documentFolder here anymore

const schemaTypes = [
  post,
  event,
  documentFile,
  rsvpResponse,
  // 👆 and add any extra schemas you imported above
]

export default schemaTypes
