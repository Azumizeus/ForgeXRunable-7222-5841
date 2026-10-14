# Forge-X — task
Port SolForge/ULTIMATE forge -> Runable stack. SaaS monétisable.
- [x] schema + engine
- [x] routes: collections, layers, traits(upload/demo/ai/transform), generate, exports (stream zip), plan IA, billing, candy — tested via curl
- [x] http: /api/file/*, /api/render/:gen/:ed, /api/preview/:cid, auth
- [x] autumn push
- NOTE: ai pinned to 6.0.306 (v7 breaks gateway file parts)
- [x] UI: design.md, landing, pricing, sign-in, dashboard, studio wizard 8 steps
- [x] lint/build + browser test e2e
- [x] Prix Autumn corrigé (19/49 $), checkout payant testé → Creator
- [x] i18n FR/EN complet (client useT + serveur AsyncLocalStorage via header x-lang)
- [ ] Non vérifié : Google sign-in, génération trait IA depuis l UI, téléchargement par vrai clic
