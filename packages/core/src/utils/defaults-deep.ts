import { mergeWith } from 'lodash'

function customizer(_objectValue: Object, sourceValue: Object) {
  return Array.isArray(sourceValue) ? sourceValue : undefined
}

export default function defaultsDeep(...sources: Object[]) {
  const output = Object.create(null)

  for (const source of sources.reverse()) {
    mergeWith(output, source, customizer)
  }

  return output
}
