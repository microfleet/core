export function fromPathToName(path: string, prefix: string): string {
  const { length } = prefix
  const start = length ? length + 2 : 1
  const end = path[path.length - 1] === '/' ? -1 : undefined
  return path.slice(start, end).replace(/\//g, '.')
}

export function fromNameToPath(name: string, prefix: string): string {
  const actionName = prefix.length ? `/${prefix}/${name}` : `/${name}`
  return actionName.replace(/\./g, '/')
}
