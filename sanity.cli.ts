import { defineCliConfig } from 'sanity/cli'

/**
 * Config for the `sanity` CLI (`npx sanity ...`), separate from sanity.config.ts
 * which configures the Studio embedded at /studio.
 *
 * Without this file the CLI refuses to run at all — "No CLI config found" — so
 * `sanity deploy`, `sanity schema extract` and the dataset commands are all
 * unavailable. The Studio itself works without it, which is why this was only
 * noticed when the schema needed deploying.
 *
 * projectId and dataset come from the same env vars the site and Studio use,
 * so there is one source of truth and nothing sensitive is committed.
 */
export default defineCliConfig({
  api: {
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  },
  // The Studio is served by Next at /studio. This only affects `sanity deploy`,
  // which publishes the hosted copy at <projectId>.sanity.studio.
  studioHost: 'bhuwanta',
})
