const FILE_MISSING_ERROR_MESSAGE = 'could not find associated data'
const FILE_ALREADY_PROCESSED_MESSAGE = '412: upload was already processed'

module.exports = {
  beforeSend(event) {
    if (
      event &&
      event.extra &&
      event.extra.err &&
      event.extra.err.message &&
      (event.extra.err.message === FILE_MISSING_ERROR_MESSAGE ||
        event.extra.err.message === FILE_ALREADY_PROCESSED_MESSAGE)
    ) {
      return null
    }

    return event
  }
}
