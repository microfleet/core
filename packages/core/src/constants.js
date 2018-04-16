/**
 * Commonly used constants
 */

// ========================
// Transport Types
// ========================
const kAMQP = Symbol('amqp');
const kHTTP = Symbol('http');
const kSocketIO = Symbol('socketio');
const kInternal = Symbol('internal');

exports.ActionTransport = {
  amqp: kAMQP,
  http: kHTTP,
  socketio: kSocketIO,
  socketIO: kSocketIO,
  internal: kInternal,
};

// =========================
// Plugin Types & Default Priority Levels
// Controls order of startup/shutdown
// =========================
const kDatabase = Symbol('database');
const kEssential = Symbol('essential');
const kMigration = Symbol('migration');
const kTransport = Symbol('transport');
const kApplication = Symbol('application');

exports.ConnectorTypes = {
  database: kDatabase,
  essential: kEssential,
  migration: kMigration,
  transport: kTransport,
  application: kApplication,
};

exports.ConnectorPriorities = {
  [kEssential]: 1000,
  [kDatabase]: 900,
  [kMigration]: 800,
  [kTransport]: 700,
  [kApplication]: 100,
};

// ==============================
// Utility State Symbols
// ==============================
const kStarted = Symbol('started');

exports.State = {
  started: kStarted,
};
