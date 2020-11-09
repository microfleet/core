import { mergeWith } from 'lodash'

export function customizer(_objectValue: Record<string, unknown>, sourceValue: Record<string, unknown>): Record<string, unknown> | void {
  return Array.isArray(sourceValue) ? sourceValue : undefined
}

export function defaultsDeep<T>(...sources: Partial<T>[]): T {
  const output = Object.create(null)

  for (const source of sources.reverse()) {
    mergeWith(output, source, customizer)
  }

  return output
}
