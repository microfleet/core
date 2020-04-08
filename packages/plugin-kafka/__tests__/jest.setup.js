jest.setTimeout(120000)

// Patch tests
jasmine.getEnv().addReporter({
  specStarted: result => jasmine.currentTest = result,
  specDone: result => jasmine.currentTest = result,
});
