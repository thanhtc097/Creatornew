CreatorNew Prompt Sync

Installation
1. Upload creatornew-prompt-sync.zip in WordPress > Plugins > Add New > Upload Plugin.
2. Activate the plugin.
3. Open WordPress > Tools > CreatorNew Prompt Sync.
4. Click Sync Prompts Now.
5. Verify https://creatornew.com/data/prompts-chat.json and confirm that prompts is not empty.

Sources
- prompts.chat (CC0)
- Useful AI Prompts by AJ Geddes (MIT)
- RISE University of Basel Prompt Library (CC BY 4.0)

The plugin retries with the official prompts.chat GitHub CSV if the API is unavailable, then adds prompts from the other licensed sources.
Automatic synchronization runs every 30 minutes through WP-Cron. WP-Cron is traffic-driven, so low-traffic sites may run slightly later.
It writes only /data/prompts-chat.json and does not change the website interface.
