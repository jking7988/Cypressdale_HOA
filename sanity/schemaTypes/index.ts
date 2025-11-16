// schemaTypes.ts
import post from './post';
import event from './event';
import documentFolder from './documentFolder';
import documentFile from './documentFile';
import rsvpResponse from './rsvpResponse';
import yardWinner from './yardWinner';
import holidayWinner from './holidayWinner'

const schemaTypes = [
  post,
  event,
  documentFolder,  // 🔹 folder type first (order doesn’t really matter, but this is tidy)
  documentFile,    // 🔹 file type that references documentFolder
  rsvpResponse,
  yardWinner,
  holidayWinner,
];

export default schemaTypes;
