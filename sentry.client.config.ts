import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Production-optimized: sample 20% of traces to reduce bundle overhead
  tracesSampleRate: 0.2,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  replaysOnErrorSampleRate: 0.5,

  // Sample 5% of sessions for replay in production
  replaysSessionSampleRate: 0.05,
});

// Session Replay is loaded after the page instead of being bundled with it:
// it is the largest part of the Sentry client (~35 KB compressed) and it only
// needs to be recording once the page is up. Errors are still captured from
// the first moment by Sentry.init above.
if (typeof window !== 'undefined') {
  const start = () =>
    Sentry.lazyLoadIntegration('replayIntegration')
      .then((replayIntegration) => {
        Sentry.addIntegration(
          replayIntegration({ maskAllText: true, blockAllMedia: true }),
        );
      })
      .catch(() => {
        // Replay is optional; error reporting works without it.
      });

  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(start, { timeout: 5000 });
  } else {
    window.setTimeout(start, 3000);
  }
}
