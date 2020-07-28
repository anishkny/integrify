const { credentials, makeid, sleep } = require('./util');
const fft = require('firebase-functions-test')(
  {
    projectId: credentials.projectId,
  },
  credentials.serviceAccountKeyFile
);
const test = require('ava');
const { integrify } = require('../lib');
const { replaceReferencesWith, getPrimaryKey } = require('../lib/common');
const { getState, setState } = require('./functions/stateMachine');

const admin = require('firebase-admin');
admin.initializeApp({
  credential: admin.credential.cert(credentials.certificate),
});
const db = admin.firestore();

async function clearFirestore() {
  const collections = ['detail1', 'detail2', 'detail3', 'somecoll'];
  for (const collection of collections) {
    const { docs } = await admin
      .firestore()
      .collectionGroup(collection)
      .get();
    for (const doc of docs) {
      doc.ref.delete();
    }
  }
  await fft.cleanup();
}

let unsubscribe = null;
test.after(async () => {
  if (unsubscribe) {
    unsubscribe();
  }
  await clearFirestore();
});

const testsuites = [
  ['rules-in-situ', require('./functions')],
  ['rules-in-file', require('./functions/rules-from-file.index')],
];

testsuites.forEach(testsuite => {
  const name = testsuite[0];
  const sut = testsuite[1];

  test(`[${name}] test basic characteristics`, async t => {
    t.true(sut.replicateMasterToDetail.name === 'cloudFunction');
    t.truthy(sut.replicateMasterToDetail.run);
  });
  test(`[${name}] test get primary key`, async t =>
    testPrimaryKey(sut, t, name));
  test(`[${name}] test target collection parameter swap`, async t =>
    testTargetVariableSwap(sut, t, name));

  // Standard functionality
  test(`[${name}] test replicate attributes`, async t =>
    testReplicateAttributes(sut, t, name));
  test(`[${name}] test delete references`, async t =>
    testDeleteReferences(sut, t, name));
  test(`[${name}] test maintain count`, async t => testMaintainCount(sut, t));

  // Added by GitLive
  test(`[${name}] test replicate attributes delete when field is not there`, async t =>
    testReplicateAttributesDeleteEmpty(sut, t, name));
  test(`[${name}] test replicate attributes with missing primary key in source reference`, async t =>
    testReplicateMissingSourceCollectionKey(sut, t, name));

  test(`[${name}] test delete with masterId in target reference`, async t =>
    testDeleteParamReferences(sut, t, name));
  test(`[${name}] test delete with snapshot fields in target reference`, async t =>
    testDeleteSnapshotFieldReferences(sut, t, name));
  test(`[${name}] test delete with missing primary key in source reference`, async t =>
    testDeleteMissingSourceCollectionKey(sut, t, name));
  test(`[${name}] test delete with missing snapshot fields in target reference`, async t =>
    testDeleteMissingFieldsReferences(sut, t, name));

  test(`[${name}] test delete all sub-collections in target reference`, async t =>
    testDeleteAllSubCollections(sut, t, name));
  test(`[${name}] test delete missing arguments error`, async t =>
    testDeleteMissingArgumentsError(sut, t, name));

  test(`[${name}] test delete pre and post hook`, async t =>
    testDeletePrePostHooks(sut, t, name));
});

async function testPrimaryKey(sut, t, name) {
  // Test one key
  let targetCollection = 'collection/{collectionId}';
  let result = getPrimaryKey(targetCollection);

  t.true(result.hasPrimaryKey);
  t.is(result.primaryKey, 'collectionId');

  // Test two keys
  targetCollection = 'collection/{collectionId}/some_detail/{detailId}';
  result = getPrimaryKey(targetCollection);
  t.true(result.hasPrimaryKey);
  t.is(result.primaryKey, 'detailId');

  // Test missing key
  targetCollection = 'collection';
  result = getPrimaryKey(targetCollection);
  t.false(result.hasPrimaryKey);
  t.is(result.primaryKey, 'masterId');

  await t.pass();
}

async function testTargetVariableSwap(sut, t, name) {
  // test no fields
  let collectionId = makeid();
  let targetCollection = 'collection';
  let documentData = {
    collectionId,
  };

  let result = replaceReferencesWith(documentData, targetCollection);

  t.false(result.hasFields);
  t.is(result.targetCollection, 'collection');

  // Test one field
  targetCollection = 'collection/$collectionId/some_detail';

  result = replaceReferencesWith(documentData, targetCollection);

  t.true(result.hasFields);
  t.is(result.targetCollection, `collection/${collectionId}/some_detail`);

  // Test multiple fields
  const testId = makeid();
  const userId = makeid();
  targetCollection = 'collection/$testId/some_detail/$userId';
  documentData = {
    collectionId,
    testId,
    userId,
  };

  result = replaceReferencesWith(documentData, targetCollection);

  t.true(result.hasFields);
  t.is(result.targetCollection, `collection/${testId}/some_detail/${userId}`);

  // Test missing field
  targetCollection = 'collection/$collectionId/some_detail';

  const error = t.throws(() => {
    replaceReferencesWith({}, targetCollection);
  });
  t.is(error.message, 'integrify: Missing dynamic reference: [$collectionId]');

  await t.pass();
}

async function testReplicateAttributes(sut, t, name) {
  // Add a couple of detail documents to follow master
  const masterId = makeid();
  await db.collection('detail1').add({
    masterId: masterId,
  });
  const nestedDocRef = db.collection('somecoll').doc('somedoc');
  await nestedDocRef.set({
    x: 1,
  });
  await nestedDocRef.collection('detail2').add({
    masterId: masterId,
  });

  // Call trigger to replicate attributes from master
  const beforeSnap = fft.firestore.makeDocumentSnapshot(
    {
      masterField5: 'missing',
    },
    `master/${masterId}`
  );
  const afterSnap = fft.firestore.makeDocumentSnapshot(
    {
      masterField1: 'after1',
      masterField3: 'after3',
    },
    `master/${masterId}`
  );
  const change = fft.makeChange(beforeSnap, afterSnap);
  const wrapped = fft.wrap(sut.replicateMasterToDetail);
  setState({
    change: null,
    context: null,
  });
  await wrapped(change, {
    params: {
      masterId: masterId,
    },
  });

  // Assert pre-hook was called (only for rules-in-situ)
  if (name === 'rules-in-situ') {
    const state = getState();
    t.truthy(state.change);
    t.truthy(state.context);
    t.is(state.context.params.masterId, masterId);
  }

  // Assert that attributes get replicated to detail documents
  await assertQuerySizeEventually(
    db
      .collection('detail1')
      .where('masterId', '==', masterId)
      .where('detail1Field1', '==', 'after1'),
    1
  );
  await assertQuerySizeEventually(
    nestedDocRef
      .collection('detail2')
      .where('masterId', '==', masterId)
      .where('detail2Field3', '==', 'after3'),
    1
  );

  // Assert irrelevant update is safely ignored
  const irrelevantAfterSnap = fft.firestore.makeDocumentSnapshot(
    {
      masterFieldIrrelevant: 'whatever',
    },
    `master/${masterId}`
  );
  const irreleventChange = fft.makeChange(beforeSnap, irrelevantAfterSnap);
  await wrapped(irreleventChange, {
    params: {
      masterId: masterId,
    },
  });

  await t.pass();
}

async function testReplicateAttributesDeleteEmpty(sut, t, name) {
  // Add a couple of detail documents to follow master
  const primaryKey = makeid();
  await db.collection('detail1').add({
    tempId: primaryKey,
    foreignDetail1: 'foreign_detail_1',
    foreignDetail2: 'foreign_detail_2',
  });

  // Call trigger to replicate attributes from master
  const beforeSnap = fft.firestore.makeDocumentSnapshot(
    {
      masterDetail1: 'after1',
      masterDetail2: 'after2',
    },
    `master/${primaryKey}`
  );
  const afterSnap = fft.firestore.makeDocumentSnapshot(
    {
      masterDetail2: 'after3',
    },
    `master/${primaryKey}`
  );
  const change = fft.makeChange(beforeSnap, afterSnap);
  const wrapped = fft.wrap(sut.replicateMasterDeleteWhenEmpty);
  setState({
    change: null,
    context: null,
  });
  await wrapped(change, {
    params: {
      primaryKey: primaryKey,
    },
  });

  // Assert pre-hook was called (only for rules-in-situ)
  if (name === 'rules-in-situ') {
    const state = getState();
    t.truthy(state.change);
    t.truthy(state.context);
    t.is(state.context.params.primaryKey, primaryKey);
  }

  // Assert that attributes get replicated to detail documents
  await assertQuerySizeEventually(
    db
      .collection('detail1')
      .where('tempId', '==', primaryKey)
      .where('foreignDetail1', '==', 'foreign_detail_1'),
    0
  );
  await assertQuerySizeEventually(
    db
      .collection('detail1')
      .where('tempId', '==', primaryKey)
      .where('foreignDetail2', '==', 'after3'),
    1
  );

  await t.pass();
}

async function testReplicateMissingSourceCollectionKey(sut, t, name) {
  // Create some docs referencing master doc
  const randomId = makeid();
  await db.collection('detail1').add({
    tempId: randomId,
    foreignDetail1: 'foreign_detail_1',
    foreignDetail2: 'foreign_detail_2',
  });

  // Trigger function to delete references
  const beforeSnap = fft.firestore.makeDocumentSnapshot(
    {
      masterDetail1: 'after1',
      masterDetail2: 'after2',
    },
    `master/${randomId}`
  );
  const afterSnap = fft.firestore.makeDocumentSnapshot(
    {
      masterDetail2: 'after3',
    },
    `master/${randomId}`
  );
  const change = fft.makeChange(beforeSnap, afterSnap);
  const wrapped = fft.wrap(sut.replicateReferencesWithMissingKey);
  setState({
    snap: null,
    context: null,
  });

  const error = await t.throwsAsync(async () => {
    await wrapped(change, {
      params: {
        randomId: randomId,
      },
    });
  });

  t.is(
    error.message,
    'integrify: Missing a primary key [masterId] in the source params'
  );

  // Assert pre-hook was called (only for rules-in-situ)
  if (name === 'rules-in-situ') {
    const state = getState();
    t.is(state.snap, null);
    t.is(state.context, null);
  }

  // Assert referencing docs were not deleted
  await assertQuerySizeEventually(
    db
      .collection('detail1')
      .where('tempId', '==', randomId)
      .where('foreignDetail1', '==', 'foreign_detail_1'),
    1
  );
  await assertQuerySizeEventually(
    db
      .collection('detail1')
      .where('tempId', '==', randomId)
      .where('foreignDetail2', '==', 'foreign_detail_2'),
    1
  );

  t.pass();
}

async function testDeleteReferences(sut, t, name) {
  // Create some docs referencing master doc
  const masterId = makeid();
  await db.collection('detail1').add({
    masterId: masterId,
  });
  const nestedDocRef = db.collection('somecoll').doc('somedoc');
  await nestedDocRef.set({
    x: 1,
  });
  await nestedDocRef.collection('detail2').add({
    masterId: masterId,
  });
  await assertQuerySizeEventually(
    db
      .collection('somecoll')
      .doc('somedoc')
      .collection('detail2')
      .where('masterId', '==', masterId),
    1
  );

  // Trigger function to delete references
  const snap = fft.firestore.makeDocumentSnapshot({}, `master/${masterId}`);
  const wrapped = fft.wrap(sut.deleteReferencesToMaster);
  setState({
    snap: null,
    context: null,
  });
  await wrapped(snap, {
    params: {
      masterId: masterId,
    },
  });

  // Assert pre-hook was called (only for rules-in-situ)
  if (name === 'rules-in-situ') {
    const state = getState();
    t.truthy(state.snap);
    t.truthy(state.context);
    t.is(state.context.params.masterId, masterId);
  }

  // Assert referencing docs were deleted
  await assertQuerySizeEventually(
    db.collection('detail1').where('masterId', '==', masterId),
    0
  );
  await assertQuerySizeEventually(
    db
      .collection('somecoll')
      .doc('somedoc')
      .collection('detail2')
      .where('masterId', '==', masterId),
    0
  );

  t.pass();
}

async function testDeleteParamReferences(sut, t, name) {
  // Create some docs referencing master doc
  const primaryKey = makeid();
  await db.collection('detail1').add({
    primaryKey: primaryKey,
  });
  const nestedDocRef = db.collection('somecoll').doc(primaryKey);
  await nestedDocRef.set({
    x: 1,
  });
  await nestedDocRef.collection('detail2').add({
    primaryKey: primaryKey,
  });
  await assertQuerySizeEventually(
    db
      .collection('somecoll')
      .doc(primaryKey)
      .collection('detail2')
      .where('primaryKey', '==', primaryKey),
    1
  );

  // Trigger function to delete references
  const snap = fft.firestore.makeDocumentSnapshot({}, `master/${primaryKey}`);
  const wrapped = fft.wrap(sut.deleteReferencesWithMasterParam);
  setState({
    snap: null,
    context: null,
  });
  await wrapped(snap, {
    params: {
      primaryKey: primaryKey,
    },
  });

  // Assert pre-hook was called (only for rules-in-situ)
  if (name === 'rules-in-situ') {
    const state = getState();
    t.truthy(state.snap);
    t.truthy(state.context);
    t.is(state.context.params.primaryKey, primaryKey);
  }

  // Assert referencing docs were deleted
  await assertQuerySizeEventually(
    db.collection('detail1').where('primaryKey', '==', primaryKey),
    0
  );
  await assertQuerySizeEventually(
    db
      .collection('somecoll')
      .doc(primaryKey)
      .collection('detail2')
      .where('primaryKey', '==', primaryKey),
    0
  );

  t.pass();
}

async function testDeleteSnapshotFieldReferences(sut, t, name) {
  // Create some docs referencing master doc
  const anotherId = makeid();
  const testId = makeid();
  await db.collection('detail1').add({
    anotherId: anotherId,
  });
  const nestedDocRef = db.collection('somecoll').doc(testId);
  await nestedDocRef.set({
    x: 1,
  });
  await nestedDocRef.collection('detail2').add({
    anotherId: anotherId,
  });
  await assertQuerySizeEventually(
    db
      .collection('somecoll')
      .doc(testId)
      .collection('detail2')
      .where('anotherId', '==', anotherId),
    1
  );

  // Trigger function to delete references
  const snap = fft.firestore.makeDocumentSnapshot(
    {
      testId,
    },
    `master/${anotherId}`
  );
  const wrapped = fft.wrap(sut.deleteReferencesWithSnapshotFields);
  setState({
    snap: null,
    context: null,
  });
  await wrapped(snap, {
    params: {
      anotherId: anotherId,
    },
  });

  // Assert pre-hook was called (only for rules-in-situ)
  if (name === 'rules-in-situ') {
    const state = getState();
    t.truthy(state.snap);
    t.truthy(state.context);
    t.is(state.context.params.anotherId, anotherId);
  }

  // Assert referencing docs were deleted
  await assertQuerySizeEventually(
    db.collection('detail1').where('anotherId', '==', anotherId),
    0
  );
  await assertQuerySizeEventually(
    db
      .collection('somecoll')
      .doc(testId)
      .collection('detail2')
      .where('anotherId', '==', anotherId),
    0
  );

  t.pass();
}

async function testDeleteMissingSourceCollectionKey(sut, t, name) {
  // Create some docs referencing master doc
  const randomId = makeid();
  await db.collection('detail1').add({
    randomId: randomId,
  });

  // Trigger function to delete references
  const snap = fft.firestore.makeDocumentSnapshot({}, `master/${randomId}`);
  const wrapped = fft.wrap(sut.deleteReferencesWithMissingKey);
  setState({
    snap: null,
    context: null,
  });

  const error = await t.throwsAsync(async () => {
    await wrapped(snap, {
      params: {
        randomId: randomId,
      },
    });
  });

  t.is(
    error.message,
    'integrify: Missing a primary key [masterId] in the source params'
  );

  // Assert pre-hook was called (only for rules-in-situ)
  if (name === 'rules-in-situ') {
    const state = getState();
    t.is(state.snap, null);
    t.is(state.context, null);
  }

  // Assert referencing docs were deleted
  await assertQuerySizeEventually(
    db.collection('detail1').where('randomId', '==', randomId),
    1
  );

  t.pass();
}

async function testDeleteMissingFieldsReferences(sut, t, name) {
  // Create some docs referencing master doc
  const randomId = makeid();
  const testId = makeid();
  await db.collection('detail1').add({
    randomId: randomId,
  });
  const nestedDocRef = db.collection('somecoll').doc(testId);
  await nestedDocRef.set({
    x: 1,
  });
  await nestedDocRef.collection('detail2').add({
    randomId: randomId,
  });
  await assertQuerySizeEventually(
    db
      .collection('somecoll')
      .doc(testId)
      .collection('detail2')
      .where('randomId', '==', randomId),
    1
  );

  // Trigger function to delete references
  const snap = fft.firestore.makeDocumentSnapshot({}, `master/${randomId}`);
  const wrapped = fft.wrap(sut.deleteReferencesWithMissingFields);
  setState({
    snap: null,
    context: null,
  });

  const error = await t.throwsAsync(async () => {
    await wrapped(snap, {
      params: {
        randomId: randomId,
      },
    });
  });

  t.is(error.message, 'integrify: Missing dynamic reference: [$source.testId]');

  // Assert pre-hook was called (only for rules-in-situ)
  if (name === 'rules-in-situ') {
    const state = getState();
    t.truthy(state.snap);
    t.truthy(state.context);
    t.is(state.context.params.randomId, randomId);
  }

  // Assert referencing docs were deleted
  await assertQuerySizeEventually(
    db.collection('detail1').where('randomId', '==', randomId),
    0
  );
  await assertQuerySizeEventually(
    db
      .collection('somecoll')
      .doc(testId)
      .collection('detail2')
      .where('randomId', '==', randomId),
    1
  );

  t.pass();
}

async function testDeleteAllSubCollections(sut, t, name) {
  // Create some docs referencing master doc
  const randomId = makeid();
  const testId = makeid();
  const nestedDocRef = db.collection('somecoll').doc(testId);
  await nestedDocRef.set({
    x: 1,
  });
  await nestedDocRef.collection('detail2').add({
    randomId: randomId,
  });
  await nestedDocRef.collection('detail3').add({
    randomId: randomId,
  });
  await assertQuerySizeEventually(
    db
      .collection('somecoll')
      .doc(testId)
      .collection('detail2')
      .where('randomId', '==', randomId),
    1
  );
  await assertQuerySizeEventually(
    db
      .collection('somecoll')
      .doc(testId)
      .collection('detail3')
      .where('randomId', '==', randomId),
    1
  );

  // Trigger function to delete references
  const snap = fft.firestore.makeDocumentSnapshot(
    { testId },
    `master/${randomId}`
  );
  const wrapped = fft.wrap(sut.deleteReferencesDeleteAllSubCollections);
  setState({
    snap: null,
    context: null,
  });
  await wrapped(snap, {
    params: {
      randomId: randomId,
    },
  });

  // Assert pre-hook was called (only for rules-in-situ)
  if (name === 'rules-in-situ') {
    const state = getState();
    t.truthy(state.snap);
    t.truthy(state.context);
    t.is(state.context.params.randomId, randomId);
  }

  // Assert referencing docs were deleted
  await assertQuerySizeEventually(
    db
      .collection('somecoll')
      .doc(testId)
      .collection('detail2')
      .where('randomId', '==', randomId),
    0
  );
  await assertQuerySizeEventually(
    db
      .collection('somecoll')
      .doc(testId)
      .collection('detail3')
      .where('randomId', '==', randomId),
    1
  );

  t.pass();
}

async function testDeleteMissingArgumentsError(sut, t, name) {
  // Create some docs referencing master doc
  const randomId = makeid();

  // Trigger function to delete references
  const snap = fft.firestore.makeDocumentSnapshot({}, `master/${randomId}`);
  const wrapped = fft.wrap(sut.deleteReferencesMissingArgumentsErrors);
  setState({
    snap: null,
    context: null,
  });
  const error = await t.throwsAsync(async () => {
    await wrapped(snap, {
      params: {
        randomId: randomId,
      },
    });
  });
  t.is(
    error.message,
    'integrify: missing foreign key or set deleteAll to true'
  );

  t.pass();
}

async function testDeletePrePostHooks(sut, t, name) {
  // Create some docs referencing master doc
  const randomId = makeid();
  const testId = makeid();
  const nestedDocRef = db.collection('somecoll').doc(testId);
  await nestedDocRef.collection('detail2').add({
    randomId: randomId,
  });
  await assertQuerySizeEventually(
    db
      .collection('somecoll')
      .doc(testId)
      .collection('detail2')
      .where('randomId', '==', randomId),
    1
  );

  // Trigger function to delete references
  const snap = fft.firestore.makeDocumentSnapshot(
    {
      testId,
    },
    `master/${randomId}`
  );
  const wrapped = fft.wrap(sut.deleteReferencesDeleteAllSubCollections);
  setState({
    snap: null,
    context: null,
    pre_count: 0,
    post_count: 0,
  });
  await wrapped(snap, {
    params: {
      randomId: randomId,
    },
  });

  // Assert pre-hook was called (only for rules-in-situ)
  if (name === 'rules-in-situ') {
    const state = getState();
    t.truthy(state.snap);
    t.truthy(state.context);
    t.is(state.pre_count, 1);
    t.is(state.context.params.randomId, randomId);
    t.truthy(state.snap);
    t.truthy(state.context);
    t.is(state.post_count, 2);
    t.is(state.context.params.randomId, randomId);
  }

  // Assert referencing docs were deleted
  await assertQuerySizeEventually(
    db
      .collection('somecoll')
      .doc(testId)
      .collection('detail2')
      .where('randomId', '==', randomId),
    0
  );

  t.pass();
}

async function testMaintainCount(sut, t) {
  // Create an article to be favorited
  const articleId = makeid();
  await db
    .collection('articles')
    .doc(articleId)
    .set({
      favoritesCount: 0,
    });

  // Favorite the article a few times
  const NUM_TIMES_TO_FAVORITE = 5;
  const wrappedUpdater = fft.wrap(sut.maintainFavoritesCount);
  const promises = [];
  const emptySnap = fft.firestore.makeDocumentSnapshot({});
  const snap = fft.firestore.makeDocumentSnapshot(
    {
      articleId: articleId,
    },
    `favorites/${makeid()}`
  );
  for (let i = 1; i <= NUM_TIMES_TO_FAVORITE; ++i) {
    promises.push(wrappedUpdater(fft.makeChange(emptySnap, snap)));
    await sleep(500);
  }

  // Unfavorite the article a few times
  const NUM_TIMES_TO_UNFAVORITE = 3;
  for (let i = 1; i <= NUM_TIMES_TO_UNFAVORITE; ++i) {
    promises.push(wrappedUpdater(fft.makeChange(snap, emptySnap)));
    await sleep(500);
  }
  await Promise.all(promises);

  // Assert article has expected number of favoritesCount
  await assertDocumentValueEventually(
    db.collection('articles').doc(articleId),
    'favoritesCount',
    NUM_TIMES_TO_FAVORITE - NUM_TIMES_TO_UNFAVORITE
  );

  // Ensure warning is printed if triggered by an actual update
  await wrappedUpdater(fft.makeChange(snap, snap));

  // Delete article and ensure favoritesCount is not updated on decrement or
  // increment
  await db
    .collection('articles')
    .doc(articleId)
    .delete();
  await wrappedUpdater(fft.makeChange(snap, emptySnap));
  await wrappedUpdater(fft.makeChange(emptySnap, snap));
  await assertQuerySizeEventually(
    db
      .collection('articles')
      .where(admin.firestore.FieldPath.documentId(), '==', articleId),
    0
  );

  t.pass();
}

test('test error conditions', async t => {
  t.throws(() => integrify({}), {
    message: /Input must be rule or config/i,
  });
  t.throws(
    () =>
      integrify({
        rule: 'UNKNOWN_RULE_4a4e261a2e37',
      }),
    {
      message: /Unknown rule/i,
    }
  );
  t.throws(() => require('./functions-bad-rules-file'), {
    message: /Unknown rule/i,
  });
  t.throws(() => require('./functions-absent-rules-file'), {
    message: /Rules file not found/i,
  });

  t.pass();
});

async function assertDocumentValueEventually(
  docRef,
  fieldPath,
  expectedValue,
  log = console.log
) {
  log(
    `Asserting doc [${docRef.path}] field [${fieldPath}] has value [${expectedValue}] ... `
  );
  const doc = await docRef.get();
  if (doc.exists) {
    const newValue = doc.get(fieldPath);
    log(`Current value: [${newValue.toString()}] `);
    if (newValue === expectedValue) {
      log('Matched!');
    }
  }
}

async function assertQuerySizeEventually(
  query, // Type: FirebaseFirestore.Query<FirebaseFirestore.DocumentData>
  expectedResultSize, // Type: number
  log = console.log // Type: (...data: any[]): void
) {
  log(`Asserting query result to have [${expectedResultSize}] entries ... `);
  const docs = await query.get();
  log(`Current result size: [${docs.size}]`);
  if (docs.size === expectedResultSize) {
    log('Matched!');
  }
  return docs;
}
