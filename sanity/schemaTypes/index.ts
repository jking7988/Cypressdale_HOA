// sanity/schemaTypes/index.ts

import post from './post';
import event from './event';
import documentFile from './documentFile';
import documentFolder from './documentFolder';
// If you still want the old standalone RSVP docs, you *can* keep this,
// but based on what you said, we DON'T want them anymore:
// import rsvpResponse from './rsvpResponse';

import yardWinner from './yardWinner';
import holidayWinner from './holidayWinner';

const schemaTypes = [
  post,
  event,
  documentFolder,   // 👈 this was missing and caused the error
  documentFile,
  yardWinner,
  holidayWinner,
  // rsvpResponse,   // 👈 leave this OUT if RSVPs live inside events now
];

export default schemaTypes;
