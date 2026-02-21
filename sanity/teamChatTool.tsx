// teamChatTool.tsx
import {definePlugin} from 'sanity';
import TeamChatView from './TeamChatView';

export const teamChatTool = definePlugin({
  name: 'team-chat-tool',
  tools: [
    {
      name: 'teamChat',
      title: 'Team Chat',
      component: TeamChatView,
    },
  ],
});
