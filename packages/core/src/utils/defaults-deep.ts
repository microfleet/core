import { mergeWith } from 'lodash'

function customizer(_objectValue: Record<string, unknown>, sourceValue: Record<string, unknown>): Record<string, unknown> | void {
  return Array.isArray(sourceValue) ? sourceValue : undefined
}

export default function defaultsDeep(...sources: Record<string, unknown>[]): Record<string, unknown> {
  const output = Object.create(null)

  for (const source of sources.reverse()) {
    mergeWith(output, source, customizer)
  }

  return output
}
