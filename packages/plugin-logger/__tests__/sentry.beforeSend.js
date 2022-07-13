const FILE_MISSING_ERROR_MESSAGE = 'could not find associated data'
const FILE_ALREADY_PROCESSED_MESSAGE = '412: upload was already processed'

module.exports = {
  beforeSend(event, hint) {
    const err = hint.originalException
    if (
      err &&
      err.message &&
      (err.message === FILE_MISSING_ERROR_MESSAGE ||
        err.message === FILE_ALREADY_PROCESSED_MESSAGE)
    ) {
      return null
    }

    return event
  }
}
