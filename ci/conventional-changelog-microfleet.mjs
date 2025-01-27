import createAngularPreset from 'conventional-changelog-angular'
import _debug from 'debug'

const debug = _debug('release-it:aggregate-conventional-changelog')

const whatBump = (commits) => {
  let level = undefined
  let breakings = 0
  let features = 0
  let patches = 0

  commits.forEach(commit => {
    debug(commit)

    if (commit.notes.length > 0) {
      breakings += commit.notes.length
      level = 0
    } else if (commit.type === 'feat') {
      features += 1
      if (level === 2 || level === undefined) {
        level = 1
      }
    } else if (['fix', 'patch', 'revert', 'refactor', 'docs', 'style'].includes(commit.type)) {
      patches += 1
      if (level === undefined) {
        level = 2
      }
    }
  })

  return {
    level: level,
    reason: breakings === 1
      ? `There is ${breakings} BREAKING CHANGE, ${features} features and ${patches} patches`
      : `There are ${breakings} BREAKING CHANGES, ${features} features and ${patches} patches`
  }
}

export default async function createPreset() {
  const preset = await createAngularPreset()
  preset.whatBump = whatBump
  return preset
}
