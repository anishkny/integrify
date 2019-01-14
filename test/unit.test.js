const test = require('ava');

const fft = require('firebase-functions-test')(
  { projectId: '## TODO ##' },
  '## TODO ##'
);
const sut = require('./functions');

test('basic require', t => {
  console.log(sut);
  t.true(sut.replicateMasterToDetail.name === 'cloudFunction');
  t.truthy(sut.replicateMasterToDetail.run);
});

test('online mode', async t => {
  const beforeSnap = fft.firestore.makeDocumentSnapshot(
    { masterField1: 'before' },
    'master/foo'
  );
  const afterSnap = fft.firestore.makeDocumentSnapshot(
    { masterField1: 'after' },
    'master/foo'
  );
  const change = fft.makeChange(beforeSnap, afterSnap);
  const wrapped = fft.wrap(sut.replicateMasterToDetail);
  await wrapped(change, { params: { masterId: 'foo' } });
  t.pass();
});
