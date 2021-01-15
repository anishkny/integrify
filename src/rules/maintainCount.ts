import * as admin from 'firebase-admin';
import { Config, ForeignKeyFunction, Rule } from '../common';

export interface MaintainCountRule extends Rule {
  source: {
    collection: string;
    foreignKey: string;
  };
  target: {
    collection: string;
    attribute: string;
  };
  hooks?: {
    pre?: ForeignKeyFunction;
  };
}

export function isMaintainCountRule(arg: Rule): arg is MaintainCountRule {
  return arg.rule === 'MAINTAIN_COUNT';
}

export function integrifyMaintainCount(
  rule: MaintainCountRule,
  config: Config
) {
  const functions = config.config.functions;
  const db = config.config.db;

  return functions.firestore
    .document(`${rule.source.collection}/{docId}`)
    .onWrite(async change => {
      // Determine if document has been added or deleted
      const documentWasAdded = change.after.exists && !change.before.exists;
      const documentWasDeleted = !change.after.exists && change.before.exists;

      if (documentWasAdded) {
        await updateCount(change.after, Delta.Increment);
      } else if (documentWasDeleted) {
        await updateCount(change.before, Delta.Decrement);
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
    let targetId = snap.get(rule.source.foreignKey);
    // Check if there is formatting that needs to happen to the targetId
    if (rule.hooks.pre) {
      targetId = await rule.hooks.pre(targetId);
    }
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
    await targetRef.update(update);
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
