// Order drives grouped post listings and the social-card footer, so it reads
// as a rough pipeline: build a model, run it, ship it, on what, with what,
// and the theory posts that sit alongside all of it.
export const POST_CATEGORIES = [
  'Models & Training',
  'Inference & Deployment',
  'Serving & Runtime',
  'Hardware & Systems',
  'Ecosystems & Tooling',
  'Theory & Mathematics'
] as const

export type PostCategory = (typeof POST_CATEGORIES)[number]
