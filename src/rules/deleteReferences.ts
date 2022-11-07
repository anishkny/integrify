import { CloudFunction } from 'firebase-functions';
import { QueryDocumentSnapshot } from 'firebase-functions/lib/v1/providers/firestore';

import { Config, Rule } from '../common';

export interface DeleteReferencesRule {
  rule: 'DELETE_REFERENCES';
  name?: string;
  source: {
    collection: string;
  };
  targets: {
    collection: string;
    foreignKey: string;
    isCollectionGroup?: boolean;
  }[];
  hooks?: {
    // eslint-disable-next-line @typescript-eslint/ban-types
    pre?: Function;
  };
}

export function isDeleteReferencesRule(arg: Rule): arg is DeleteReferencesRule {
  return arg.rule === 'DELETE_REFERENCES';
}

export type DeleteReferencesFunction = CloudFunction<QueryDocumentSnapshot>;

export function integrifyDeleteReferences(
  rule: DeleteReferencesRule,
  config: Config
): DeleteReferencesFunction {
  const functions = config.config.functions;

  rule.targets.forEach((target) =>
    console.log(
      `integrify: Creating function to delete all references to source [${rule.source.collection}] from [${target.collection}] linked by key [${target.foreignKey}]`
    )
  );

  return functions.firestore
    .document(`${rule.source.collection}/{masterId}`)
    .onDelete((snap, context) => {
      const masterId = context.params.masterId;
      console.log(
        `integrify: Detected delete in [${rule.source.collection}], id [${masterId}]`
      );

      // Call "pre" hook if defined
      const promises = [];
      // istanbul ignore else
      if (rule.hooks && rule.hooks.pre) {
        promises.push(rule.hooks.pre(snap, context));
        console.log(`integrify: Running pre-hook: ${rule.hooks.pre}`);
      }

      // Loop over each target
      const db = config.config.db;
      rule.targets.forEach((target) => {
        console.log(
          `integrify: Deleting all docs in collection ${
            target.isCollectionGroup ? 'group ' : ''
          }[${target.collection}] where foreign key [${
            target.foreignKey
          }] matches [${masterId}]`
        );
        // Delete all docs in this target corresponding to deleted master doc
        let whereable = null;
        if (target.isCollectionGroup) {
          whereable = db.collectionGroup(target.collection);
        } else {
          whereable = db.collection(target.collection);
        }
        promises.push(
          whereable
            .where(target.foreignKey, '==', masterId)
            .get()
            .then((querySnap) => {
              querySnap.forEach((doc) => {
                console.log(
                  `integrify: Deleting [${target.collection}]${
                    target.isCollectionGroup ? ' (group)' : ''
                  }, id [${doc.id}]`
                );
                promises.push(doc.ref.delete());
              });
            })
        );
      });
      return Promise.all(promises);
    });
}
