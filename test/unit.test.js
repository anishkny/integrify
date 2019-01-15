const fft = require('firebase-functions-test')(...getFirebaseCredentials());
const sut = require('./functions');
const test = require('ava');

const admin = require('firebase-admin');
admin.initializeApp(...getFirebaseCredentials());
const db = admin.firestore();

test('test require', t => {
  t.true(sut.replicateMasterToDetail.name === 'cloudFunction');
  t.truthy(sut.replicateMasterToDetail.run);
});

test('test REPLICATE_ATTRIBUTES (online mode)', async t => {
  // Add a couple of detail documents to follow master
  const masterId = makeid();
  await db.collection('detail1').add({ masterId: masterId });
  await db.collection('detail2').add({ masterId: masterId });

  // Call trigger to replicate attributes from master
  const beforeSnap = fft.firestore.makeDocumentSnapshot(
    {},
    `master/${masterId}`
  );
  const afterSnap = fft.firestore.makeDocumentSnapshot(
    { masterField1: 'after1', masterField3: 'after3' },
    `master/${masterId}`
  );
  const change = fft.makeChange(beforeSnap, afterSnap);
  const wrapped = fft.wrap(sut.replicateMasterToDetail);
  await wrapped(change, { params: { masterId: masterId } });

  // Assert that attributes get replicated to detail documents
  await sleep(5000);
  const result1 = await getQuerySnapshot('detail1', [
    'masterId',
    '==',
    masterId,
  ]);
  t.is(result1[0].get('detail1Field1'), 'after1');
  const result2 = await getQuerySnapshot('detail2', [
    'masterId',
    '==',
    masterId,
  ]);
  t.is(result2[0].get('detail2Field1'), 'after1');
  t.is(result2[0].get('detail2Field3'), 'after3');
  t.pass();
});

test('test DELETE_REFERENCES (online mode)', async t => {
  // Create some docs referencing master doc
  const masterId = makeid();
  const detailRef = await db.collection('detail1').add({ masterId: masterId });

  // Trigger function to delete references
  const snap = fft.firestore.makeDocumentSnapshot({}, `master/${masterId}`);
  const wrapped = fft.wrap(sut.deleteReferencesToMaster);
  await wrapped(snap, { params: { masterId: masterId } });

  // Assert referencing docs were deleted
  const result = await getQuerySnapshot(
    'detail1',
    ['masterId', '==', masterId],
    true
  );
  t.is(result.length, 0);

  t.pass();
});

async function getQuerySnapshot(collection, where, expectZeroResults = false) {
  let querySnap = null;
  const docs = [];
  for (let i = 0; i < 10; ++i) {
    querySnap = await db
      .collection(collection)
      .where(...where)
      .get();
    if (
      (expectZeroResults && !querySnap.size) ||
      (!expectZeroResults && querySnap.size)
    ) {
      return querySnap.docs;
    }
    await sleep(1000);
  }
}

function getFirebaseCredentials() {
  const serviceAccountKeyFile = `${__dirname}/service-account-key.json`;
  return [
    { projectId: require(serviceAccountKeyFile).project_id },
    serviceAccountKeyFile,
  ];
}

function makeid() {
  return Math.random()
    .toString(36)
    .substr(2);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
