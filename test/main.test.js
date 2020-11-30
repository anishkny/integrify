const assert = require('chai').assert;

const { integrify } = require('../lib');

const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

describe('Error conditions', () => {
  it('should error on bad rule', () => {
    assert.throws(
      () => integrify({ rule: 'BAD_RULE_ea8e3a2a2d3e' }),
      /Unknown rule/i
    );
    assert.throws(() => require('./functions-bad-rules-file'), /Unknown rule/i);
  });

  it('should error on no rule or config', () => {
    assert.throws(() => integrify(42), /Input must be rule or config/i);
  });

  it('should error on absent config file', () => {
    assert.throws(
      () => require('./functions-absent-rules-file'),
      /Rules file not found/i
    );
  });
});

describe('REPLICATE_ATTRIBUTES', () => {
  it('should replicate attributes', async () => {
    // Create master document to replicate from
    const masterRef = await db
      .collection('master')
      .add({ random: Math.random() });
    const masterId = masterRef.id;

    // Create couple of detail docs to replicate to
    await db.collection('detail1').add({ masterId });
    await db.collection('detail2').add({ masterId });

    // Update master doc
    const masterField1 = randstr();
    const masterField2 = randstr();
    await masterRef.update({ masterField1, masterField2 });

    // Ensure update is reflected in detail docs
    await assertQuerySizeEventually(
      db
        .collection('detail1')
        .where('masterId', '==', masterId)
        .where('detail1Field1', '==', masterField1),
      1
    );
    await assertQuerySizeEventually(
      db
        .collection('detail2')
        .where('masterId', '==', masterId)
        .where('detail2Field1', '==', masterField1),
      1
    );

    // Make an irrelevant update
    await masterRef.set({ someOtherField: randstr() });

    // Ensure prehook is called twice (once for each update)
    await assertQuerySizeEventually(
      db
        .collection('prehooks')
        .where(
          'message',
          '==',
          '[788a32e05504] REPLICATE_ATTRIBUTES prehook was called!'
        ),
      2
    );
  });
});

describe('DELETE_REFERENCES', () => {
  it('should delete references', async () => {
    // Create master document to replicate from
    const masterRef = await db
      .collection('master')
      .add({ random: Math.random() });
    const masterId = masterRef.id;

    // Create couple of detail docs to replicate to
    await db.collection('detail1').add({ masterId });
    await db.collection('detail2').add({ masterId });

    // Delete master doc
    await masterRef.delete();

    // Ensure detail docs are deleted
    await assertQuerySizeEventually(
      db.collection('detail1').where('masterId', '==', masterId),
      0
    );
    await assertQuerySizeEventually(
      db.collection('detail2').where('masterId', '==', masterId),
      0
    );

    // Ensure prehook is called
    await assertQuerySizeEventually(
      db
        .collection('prehooks')
        .where(
          'message',
          '==',
          '[6a8f4f8f090c] DELETE_REFERENCES prehook was called!'
        ),
      1
    );
  });
});

// Helper functions
function randstr() {
  return Math.random().toString(36).substr(2);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function keypress() {
  console.log('Press any key to continue...');
  process.stdin.setRawMode(true);
  return new Promise((resolve) =>
    process.stdin.once('data', () => {
      process.stdin.setRawMode(false);
      resolve();
    })
  );
}

async function assertQuerySizeEventually(
  query,
  expectedResultSize,
  log = console.log
) {
  log(`Asserting query result to have [${expectedResultSize}] entries ... `);
  await sleep(1000);
  const docs = await new Promise((res) => {
    unsubscribe = query.onSnapshot((snap) => {
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
