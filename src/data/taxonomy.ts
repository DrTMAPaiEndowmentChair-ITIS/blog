export const POST_CATEGORIES = [
  'Models & Training',
  'Inference & Deployment',
  'Hardware & Systems',
  'Ecosystems & Tooling'
] as const

export type PostCategory = (typeof POST_CATEGORIES)[number]
