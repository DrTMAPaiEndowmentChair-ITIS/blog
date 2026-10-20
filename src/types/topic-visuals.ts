export type VisualContext = {
  id: string
  title: string
  description: string
  takeaway: string
  caveat?: string
  sources?: { label: string; href: string }[]
}

export type TopicVisual = VisualContext &
  (
    | {
        kind: 'flow' | 'sequence'
        steps: { label: string; detail: string }[]
      }
    | {
        kind: 'compare'
        columns: { label: string; points: string[] }[]
      }
    | {
        kind: 'bars'
        unit: string
        rows: { label: string; value: number; detail?: string }[]
      }
    | {
        kind: 'matrix'
        columns: string[]
        rows: { label: string; cells: string[] }[]
      }
    | {
        kind: 'line'
        xLabel: string
        yLabel: string
        points: { x: number; y: number }[]
      }
  )

export type TopicVisualEntry = {
  visuals: TopicVisual[]
}

export type TopicVisualRegistry = Record<string, TopicVisualEntry>
