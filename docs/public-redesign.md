# Bhuwanta public website redesign

The public layout applies the emerald, gold and ivory design system to all public routes. The operational CRM, real-estate software and Sanity Studio retain their existing application interfaces.

The approved logo artwork is used in the header and footer. Shared banners, calls to action, trust strip, project filters, article typography, cards and form styling use the same theme. The homepage now provides location discovery, buying steps and the existing project-aware enquiry form. Placeholder inventory is replaced with an enquiry empty state. Project-specific documents and live photography remain sourced from Sanity.

“Private tour”, private-consultation copy and investor-pricing CTA wording are replaced with plain project enquiries and free site visits. Existing CMS content is still editable and is not overwritten by this code change.

## Hero asset

Asset: `public/images/township-concept.jpg` (optimized from the built-in imagegen output). It is labelled as a concept illustration, not an actual project layout. No interactive 3D viewer is implemented; that is a separate future update requiring the user's layout.

Generation prompt: Create a premium architectural visualization asset for Bhuwanta real estate website hero, landscape 1536x1024. No text, no logos, no UI. Exquisitely realistic miniature open-plot township on a floating cutaway earth slab, many empty lush green rectangular plots marked with restrained fine golden boundaries, tree-lined roads, small park, only two small ivory contemporary houses. Rich deep emerald #00291e studio background fading uniformly into dark emerald at all edges, cinematic warm gold sunset lighting from upper right, refined physically realistic materials, earth layers visible, three quarter aerial view. Model centered with generous dark negative space around it, entire slab visible, luxurious architectural scale-model photography aesthetic. No buildings in background, no sky, no labels, no infinity lines. This is a conceptual illustration not a real project.

## Verification

The existing six lead-flow tests pass. Targeted component lint passes. The standard `tsc --noEmit` check passes. An initial duplicate generated declaration was cleared when Next regenerated build types. All 31 static public routes returned HTTP 200 with the public layout, including location pages, project pages, articles, resources, enquiry confirmation and policies. The shared theme stylesheet is served successfully. Browser capture returned an empty surface, so visual screenshot review could not be completed in this session.

Production verification: `next build --webpack` compiled successfully and completed TypeScript. Page-data collection then failed in existing `/api/cron/daily-leads` and `/api/cron/meta-sync` routes with `supabaseKey is required`; the required backend credential is not configured in this environment. No deployment was performed.

## Motion update

The homepage uses `ImmersiveHero`: pointer-responsive CSS perspective, layered labels, a desktop sticky scroll sequence with a gradual close-up and a second text composition. This animates the concept illustration; it is not a rotatable model of a real project. The actual layout-based 3D viewer remains a future update.

`PublicMotion` enhances all public routes with one-time section/card reveals, a reading-progress line and a scroll-responsive header. Page banners and links have matching entrance/hover treatments. Scroll remains native. Motion uses animation-frame updates and intersection observation; event listeners and observers are cleaned up on route changes. Content remains visible without JavaScript. Reduced-motion mode removes reveals, tilt and the pinned sequence; mobile and short viewports use the shorter static hero structure.

Validation: targeted ESLint, standard TypeScript and the six existing lead-flow tests passed. Screenshot review remains limited by the browser's blank capture surface; no claim of full visual interaction verification is made.
