const { getFirebaseCredentials, makeid, sleep } = require('./util');
const fft = require('firebase-functions-test')(...getFirebaseCredentials());
const sut = require('./functions/zero-config.index.js');
const test = require('ava');

test('test require', t => {
  t.truthy(sut);
});
