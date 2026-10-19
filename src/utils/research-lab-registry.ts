import {
  LABS as CLASSIC,
  defaults as classicDefaults,
  renderLab as classicRender,
  type LabKind as ClassicKind,
  type LabValues
} from './article-labs'
import {
  FRONTIER_LABS,
  frontierDefaults,
  renderFrontierLab,
  type FrontierKind
} from './frontier-labs'
export type LabKind = ClassicKind | FrontierKind
export type { LabValues } from './article-labs'
export const LABS = { ...CLASSIC, ...FRONTIER_LABS }
function isClassic(kind: LabKind): kind is ClassicKind {
  return Object.hasOwn(CLASSIC, kind)
}
export function defaults(kind: LabKind) {
  return isClassic(kind) ? classicDefaults(kind) : frontierDefaults(kind)
}
export function renderLab(kind: LabKind, values?: LabValues, width?: number) {
  return isClassic(kind)
    ? classicRender(kind, values, width)
    : renderFrontierLab(kind, values, width)
}
