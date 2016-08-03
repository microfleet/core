function fromPathToName(path, prefix) {
  const slice = prefix.length ? prefix.length + 2 : 1;
  return path.slice(slice).replace(/\//g, '.');
}

function fromNameToPath(name, prefix) {
  const actionName = prefix.length ? `/${prefix}/${name}` : `/${name}`;
  return actionName.replace(/\./g, '/');
}

module.exports = {
  fromPathToName,
  fromNameToPath,
};
