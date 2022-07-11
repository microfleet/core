import { HttpStatusError } from 'common-errors'

export class InvalidSignatureError extends HttpStatusError {
  public inner_error?: Error

  constructor(message: string, error?: Error) {
    super(403, message)
    this.inner_error = error
  }
}
