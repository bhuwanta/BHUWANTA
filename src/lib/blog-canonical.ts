// Sanity blog posts that repeat a hand-built page on the site. Both versions
// were indexed, so search engines saw duplicate content and had to guess which
// to rank. The hand-built page is the canonical one: these posts point their
// canonical tag at it and are left out of the sitemap.
export const DUPLICATE_POST_CANONICALS: Record<string, string> = {
  'hmda-vs-dtcp-plots-hyderabad': '/hmda-vs-dtcp-plots-hyderabad',
  'hyderabad-plot-buyer-legal-checklist': '/resources/hyderabad-plot-buyer-legal-checklist',
  'nh44-growth-corridor-investment-map': '/resources/nh44-growth-corridor-investment-map',
}
