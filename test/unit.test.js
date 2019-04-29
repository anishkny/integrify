const { getFirebaseCredentials, makeid, sleep } = require('./util');
const fft = require('firebase-functions-test')(...getFirebaseCredentials());
const sut = require('./functions');
const test = require('ava');
const { integrify } = require('../lib');
const { getState, setState } = require('./functions/stateMachine');

const admin = require('firebase-admin');
admin.initializeApp(...getFirebaseCredentials());
const db = admin.firestore();
let unsubscribe = null;

test.after(() => {
  if (unsubscribe) {
    unsubscribe();
  }
});

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
  setState({ change: null, context: null });
  await wrapped(change, { params: { masterId: masterId } });

  // Assert pre-hook was called
  const state = getState();
  t.truthy(state.change);
  t.truthy(state.context);
  t.is(state.context.params.masterId, masterId);

  // Assert that attributes get replicated to detail documents
  await assertQuerySizeEventually(
    db
      .collection('detail1')
      .where('masterId', '==', masterId)
      .where('detail1Field1', '==', 'after1'),
    1
  );
  await assertQuerySizeEventually(
    db
      .collection('detail2')
      .where('masterId', '==', masterId)
      .where('detail2Field3', '==', 'after3'),
    1
  );

  // Assert irrelevant update is safely ignored
  const irrelevantAfterSnap = fft.firestore.makeDocumentSnapshot(
    { masterFieldIrrelevant: 'whatever' },
    `master/${masterId}`
  );
  const irreleventChange = fft.makeChange(beforeSnap, irrelevantAfterSnap);
  await wrapped(irreleventChange, { params: { masterId: masterId } });

  await t.pass();
});

test('test DELETE_REFERENCES (online mode)', async t => {
  // Create some docs referencing master doc
  const masterId = makeid();
  await db.collection('detail1').add({ masterId: masterId });

  // Trigger function to delete references
  const snap = fft.firestore.makeDocumentSnapshot({}, `master/${masterId}`);
  const wrapped = fft.wrap(sut.deleteReferencesToMaster);
  setState({ snap: null, context: null });
  await wrapped(snap, { params: { masterId: masterId } });

  // Assert pre-hook was called
  const state = getState();
  t.truthy(state.snap);
  t.truthy(state.context);
  t.is(state.context.params.masterId, masterId);

  // Assert referencing docs were deleted
  await assertQuerySizeEventually(
    db.collection('detail1').where('masterId', '==', masterId),
    0
  );

  t.pass();
});

test('test MAINTAIN_COUNT (online mode)', async t => {
  // Create an article to be favorited
  const articleId = makeid();
  await db
    .collection('articles')
    .doc(articleId)
    .set({ favoritesCount: 0 });

  // Favorite the article a few times
  const NUM_TIMES_TO_FAVORITE = 10;
  const wrappedIncrement = fft.wrap(sut.incrementFavoritesCount);
  const promises = [];
  const snap = fft.firestore.makeDocumentSnapshot(
    { articleId: articleId },
    `favorites/${makeid()}`
  );
  for (let i = 1; i <= NUM_TIMES_TO_FAVORITE; ++i) {
    promises.push(wrappedIncrement(snap));
    await sleep(500);
  }

  // Unfavorite the article a few times
  const NUM_TIMES_TO_UNFAVORITE = 7;
  const wrappedDecrement = fft.wrap(sut.decrementFavoritesCount);
  for (let i = 1; i <= NUM_TIMES_TO_UNFAVORITE; ++i) {
    promises.push(wrappedDecrement(snap));
    await sleep(500);
  }
  await Promise.all(promises);

  // Assert article has expected number of favoritesCount
  await assertDocumentValueEventually(
    db.collection('articles').doc(articleId),
    'favoritesCount',
    NUM_TIMES_TO_FAVORITE - NUM_TIMES_TO_UNFAVORITE
  );

  // Delete article and ensure favoritesCount is not updated on decrement or
  // increment
  await db
    .collection('articles')
    .doc(articleId)
    .delete();
  await wrappedDecrement(snap);
  await wrappedIncrement(snap);
  await assertQuerySizeEventually(
    db
      .collection('articles')
      .where(admin.firestore.FieldPath.documentId(), '==', articleId),
    0
  );

  t.pass();
});

test('test error conditions', async t => {
  t.throws(() => integrify({}), Error, /Input must be rule or config/i);
  t.throws(
    () => integrify({ rule: 'UNKNOWN_RULE_4a4e261a2e37' }),
    Error,
    /Unknown rule/i
  );

  t.pass();
});

async function assertDocumentValueEventually(
  docRef,
  fieldPath,
  expectedValue,
  log = console.log
) {
  log(
    `Asserting doc [${
      docRef.path
    }] field [${fieldPath}] has value [${expectedValue}] ... `
  );
  await sleep(1000);
  await new Promise(res => {
    unsubscribe = docRef.onSnapshot(snap => {
      if (snap.exists) {
        const newValue = snap.get(fieldPath);
        log(`Current value: [${newValue.toString()}] `);
        if (newValue === expectedValue) {
          log('Matched!');
          unsubscribe();
          res();
        }
      }
    });
  });
}

async function assertQuerySizeEventually(
  query,
  expectedResultSize,
  log = console.log
) {
  log(`Asserting query result to have [${expectedResultSize}] entries ... `);
  await sleep(1000);
  const docs = await new Promise(res => {
    unsubscribe = query.onSnapshot(snap => {
      log(`Current result size: [${snap.size}]`);
      if (snap.size === expectedResultSize) {
        log('Matched!');
        unsubscribe();
        res(snap.docs);
      }
    });
  });
  return docs;
}
