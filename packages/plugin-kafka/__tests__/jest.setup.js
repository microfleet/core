/* eslint-disable no-undef */
jest.setTimeout(50000)

// Patch tests
jasmine.getEnv().addReporter({
  specStarted: result => jasmine.currentTest = result,
  specDone: result => jasmine.currentTest = result,
})
