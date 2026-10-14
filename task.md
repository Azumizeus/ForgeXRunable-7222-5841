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

## Session QA finale (2026-10-14)
- Fix: Content-Disposition sur ZIP export (vérifié header Tigris)
- Fix: Plan IA tableaux markdown (remark-gfm) + styles
- Fix: étape Export marquée ✓ quand un export est prêt
- Fix: header mobile (débordement horizontal), carte démo
- New: panneau abonnement (portail Stripe, annuler/réactiver, downgrade programmé), labels Upgrade/Downgrade, refresh quotas après changement
- Fix: plan choisi sur /pricing conservé après inscription → checkout direct
- Fix: export bloqué d'avance si quota insuffisant (+ CTA)
- Testé: checkout Stripe complet (4242), upgrade Studio, downgrade Creator, cancel/uncancel, signup/signin/signout, mauvais mdp, dashboard create/demo/delete, EN, mobile 390px
- Non vérifiable: Google OAuth (popup)
