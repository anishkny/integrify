const assert = require('chai').assert;
const { integrifyDeleteReferences } = require('../lib/rules/deleteReferences');
const {
  integrifyReplicateAttributes,
} = require('../lib/rules/replicateAttributes');

function pendingWrites(count) {
  const resolvers = [];
  const promises = Array.from(
    { length: count },
    () => new Promise((resolve) => resolvers.push(resolve))
  );
  return { promises, resolve: (index) => resolvers[index]() };
}

function mockedFirestore(writeName, pending) {
  const state = { started: 0 };
  return {
    state,
    functions: {
      firestore: {
        document: () => ({
          onDelete: (handler) => handler,
          onUpdate: (handler) => handler,
        }),
      },
    },
    db: {
      collection: () => ({
        where: () => ({
          get: async () => ({
            forEach: (visit) => {
              for (let index = 0; index < pending.promises.length; index++) {
                visit({
                  id: `synthetic-detail-${index}`,
                  ref: {
                    [writeName]: () => {
                      state.started++;
                      return pending.promises[index];
                    },
                  },
                });
              }
            },
          }),
        }),
      }),
    },
  };
}

async function assertWaitsForChildWrites(handler, event, state, pending) {
  let settled = false;
  const operation = handler(...event).then(() => {
    settled = true;
  });

  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(state.started, pending.promises.length);
  assert.isFalse(
    settled,
    'trigger returned before child Firestore writes completed'
  );

  pending.resolve(0);
  await new Promise((resolve) => setImmediate(resolve));
  assert.isFalse(
    settled,
    'trigger returned before every child write completed'
  );

  pending.resolve(1);
  await operation;
  assert.isTrue(settled);
}

describe('asynchronous child writes', () => {
  it('waits for every DELETE_REFERENCES deletion', async () => {
    const pending = pendingWrites(2);
    const mock = mockedFirestore('delete', pending);
    const handler = integrifyDeleteReferences(
      {
        rule: 'DELETE_REFERENCES',
        source: { collection: 'synthetic-masters' },
        targets: [{ collection: 'synthetic-details', foreignKey: 'masterId' }],
      },
      { config: { functions: mock.functions, db: mock.db } }
    );

    await assertWaitsForChildWrites(
      handler,
      [{}, { params: { masterId: 'synthetic-master' } }],
      mock.state,
      pending
    );
  });

  it('waits for every REPLICATE_ATTRIBUTES update', async () => {
    const pending = pendingWrites(2);
    const mock = mockedFirestore('update', pending);
    const handler = integrifyReplicateAttributes(
      {
        rule: 'REPLICATE_ATTRIBUTES',
        source: { collection: 'synthetic-masters' },
        targets: [
          {
            collection: 'synthetic-details',
            foreignKey: 'masterId',
            attributeMapping: { title: 'masterTitle' },
          },
        ],
      },
      { config: { functions: mock.functions, db: mock.db } }
    );

    await assertWaitsForChildWrites(
      handler,
      [
        {
          before: { data: () => ({ title: 'before' }) },
          after: { data: () => ({ title: 'after' }) },
        },
        { params: { masterId: 'synthetic-master' } },
      ],
      mock.state,
      pending
    );
  });
});
