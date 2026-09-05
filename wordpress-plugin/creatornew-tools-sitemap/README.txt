CreatorNew Tools Sitemap
========================

Purpose
-------
Adds /tools-sitemap.xml to Rank Math's /sitemap_index.xml without changing the
WordPress theme or any CreatorNew tool page.

Installation (do not perform until approved)
--------------------------------------------
1. Upload creatornew-tools-sitemap.zip in WordPress > Plugins > Add New > Upload Plugin.
2. Activate "CreatorNew Tools Sitemap" while Rank Math's Sitemap module is enabled.
3. Open WordPress > Settings > Permalinks and click Save Changes once.
4. Clear Rank Math and page/CDN caches.
5. Verify https://creatornew.com/tools-sitemap.xml.
6. Verify that https://creatornew.com/sitemap_index.xml contains tools-sitemap.xml.

Managing tools
--------------
Edit tools.json to add or remove a tool slug. A URL is included only when the
matching /SLUG/index.html file exists in the WordPress root. The plugin derives
lastmod from that file's modification time.

Important
---------
Do not upload the repository's standalone tools-sitemap.xml to public_html when
this plugin is active. The plugin generates the same endpoint dynamically.
