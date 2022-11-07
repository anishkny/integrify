import * as admin from 'firebase-admin';
import { Change, CloudFunction } from 'firebase-functions';
import { DocumentSnapshot } from 'firebase-functions/lib/v1/providers/firestore';

import { Config, Rule } from '../common';

export interface MaintainCountRule {
  rule: 'MAINTAIN_COUNT';
  name?: string;
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

export type MaintainCountFunction = CloudFunction<Change<DocumentSnapshot>>;

export function integrifyMaintainCount(
  rule: MaintainCountRule,
  config: Config
): MaintainCountFunction {
  const functions = config.config.functions;
  const db = config.config.db;

  console.log(
    `integrify: Creating function to maintain count of [${rule.source.collection}] with foreign key [${rule.source.foreignKey}] into [${rule.target.collection}].[${rule.target.attribute}]`
  );

  return functions.firestore
    .document(`${rule.source.collection}/{docId}`)
    .onWrite((change) => {
      // Determine if document has been added or deleted
      const documentWasAdded = change.after.exists && !change.before.exists;
      const documentWasDeleted = !change.after.exists && change.before.exists;

      if (documentWasAdded) {
        return updateCount(change.after, Delta.Increment);
      } else if (documentWasDeleted) {
        return updateCount(change.before, Delta.Decrement);
      } else {
        console.log(
          `integrify: WARNING: Ignoring update trigger for MAINTAIN_COUNT on collection: [${rule.source.collection}]`
        );
      }
    });

  async function updateCount(
    snap: FirebaseFirestore.DocumentSnapshot,
    delta: Delta
  ) {
    const targetId = snap.get(rule.source.foreignKey);
    const targetRef = db.collection(rule.target.collection).doc(targetId);
    const targetSnap = await targetRef.get();

    // No-op if target does not exist
    if (!targetSnap.exists) {
      console.log(
        `integrify: WARNING: Target document does not exist in [${rule.target.collection}], id [${targetId}]`
      );
      return;
    }

    const update = {};
    update[rule.target.attribute] = admin.firestore.FieldValue.increment(delta);
    console.log(
      `integrify: Applying ${toString(delta).toLowerCase()} to [${
        rule.target.collection
      }].[${rule.target.attribute}], id: [${targetId}], update: `,
      update
    );
    return targetRef.update(update);
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
