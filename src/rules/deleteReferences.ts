import { Config, Rule } from '../common';

export interface DeleteReferencesRule extends Rule {
  source: {
    collection: string;
  };
  targets: Array<{
    collection: string;
    foreignKey: string;
  }>;
}

export function isDeleteReferencesRule(arg: Rule): arg is DeleteReferencesRule {
  return arg.rule === 'DELETE_REFERENCES';
}

export function integrifyDeleteReferences(
  rule: DeleteReferencesRule,
  config: Config
) {
  const functions = config.config.functions;

  rule.targets.forEach(target =>
    console.log(
      `integrify: Creating function to delete all references to source [${
        rule.source.collection
      }] from [${target.collection}] linked by key [${target.foreignKey}]`
    )
  );

  return functions.firestore
    .document(`${rule.source.collection}/{masterId}`)
    .onDelete((snap, context) => {
      const masterId = context.params.masterId;
      console.log(
        `integrify: Detected delete in [${
          rule.source.collection
        }], id [${masterId}]`
      );

      // Loop over each target
      const db = config.config.db;
      const promises = [];
      rule.targets.forEach(target => {
        console.log(
          `integrify: Deleting all docs in [${
            target.collection
          }] where foreign key [${target.foreignKey}] matches [${masterId}]`
        );
        // Delete all docs in this target corresponding to deleted master doc
        promises.push(
          db
            .collection(target.collection)
            .where(target.foreignKey, '==', masterId)
            .get()
            .then(querySnap => {
              querySnap.forEach(doc => {
                console.log(
                  `integrify: Deleting [${target.collection}], id [${doc.id}]`
                );
                promises.push(
                  db
                    .collection(target.collection)
                    .doc(doc.id)
                    .delete()
                );
              });
            })
        );
      });
      return Promise.all(promises);
    });
}
