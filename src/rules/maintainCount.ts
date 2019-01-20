import { Config, Rule } from '../common';

export interface MaintainCountRule extends Rule {
  source: {
    collection: string;
    foreignKey: string;
  };
  target: {
    collection: string;
    attribute: string;
  };
}

export function isMaintainCountRule(arg: Rule): arg is MaintainCountRule {
  return arg.rule === 'MAINTAIN_COUNT';
}

// TODO: Provide MAINTAIN_SHARDED_COUNT implementing distributed counters.
//       See: https://firebase.google.com/docs/firestore/solutions/counters

export function integrifyMaintainCount(
  rule: MaintainCountRule,
  config: Config
) {
  const functions = config.config.functions;
  const db = config.config.db;

  console.log(
    `integrify: Creating function to maintain count of [${
      rule.source.collection
    }] with foreign key [${rule.source.foreignKey}] into [${
      rule.target.collection
    }].[${rule.target.attribute}]`
  );

  return [
    functions.firestore
      .document(`${rule.source.collection}/{docId}`)
      .onCreate(snap => updateCount(snap, Delta.Increment)),
    functions.firestore
      .document(`${rule.source.collection}/{docId}`)
      .onDelete(snap => updateCount(snap, Delta.Decrement)),
  ];

  async function updateCount(
    snap: FirebaseFirestore.DocumentSnapshot,
    delta: Delta
  ) {
    const targetId = snap.get(rule.source.foreignKey);
    return db.runTransaction(async trans => {
      const targetRef = db.collection(rule.target.collection).doc(targetId);
      const targetSnap = await trans.get(targetRef);

      // No-op if target does not exist
      if (!targetSnap.exists) {
        console.log(
          `integrify: WARNING: Target document does not exist in [${
            rule.target.collection
          }], id [${targetId}]`
        );
        return;
      }

      let oldCount = targetSnap.get(rule.target.attribute);
      if (!oldCount) {
        oldCount = 0;
      }
      const newCount = oldCount + delta;
      const update = {};
      update[rule.target.attribute] = newCount;
      console.log(
        `integrify: Applying ${toString(delta).toLowerCase()} to [${
          rule.target.collection
        }].[${
          rule.target.attribute
        }], id [${targetId}]: [${oldCount}] => [${newCount}], update: `,
        update
      );
      return trans.set(targetRef, update, { merge: true });
    });
  }
}

const enum Delta {
  Increment = +1,
  Decrement = -1,
}

function toString(delta: Delta): string {
  if (delta === Delta.Increment) {
    return 'Increment';
  } else {
    return 'Decrement';
  }
}
