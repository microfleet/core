// @flow
function fromPathToName(path: string, prefix: string): string {
  const slice = prefix.length ? prefix.length + 2 : 1;
  return path.slice(slice).replace(/\//g, '.');
}

function fromNameToPath(name: string, prefix: string): string {
  const actionName = prefix.length ? `/${prefix}/${name}` : `/${name}`;
  return actionName.replace(/\./g, '/');
}

module.exports = {
  fromPathToName,
  fromNameToPath,
};
