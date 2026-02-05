// teamChatTool.tsx
import {definePlugin} from 'sanity';
import TeamChatView from './TeamChatView';

export const teamChatTool = definePlugin({
  name: 'team-notes-tool',
  tools: [
    {
      name: 'teamNotes',
      title: 'Team Notes',
      component: TeamChatView,
    },
  ],
});
