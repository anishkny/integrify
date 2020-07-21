import { Config, Rule, replaceReferencesWith, getPrimaryKey } from '../common';

export interface DeleteReferencesRule extends Rule {
  source: {
    collection: string;
  };
  targets: {
    collection: string;
    foreignKey?: string;
    isCollectionGroup?: boolean;
    deleteAll?: boolean;
  }[];
  hooks?: {
    pre?: Function;
  };
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
      `integrify: Creating function to delete all references to source [${rule.source.collection}] from [${target.collection}] linked by key [${target.foreignKey}]`
    )
  );

  const { hasPrimaryKey, primaryKey } = getPrimaryKey(rule.source.collection);
  if (!hasPrimaryKey) {
    rule.source.collection = `${rule.source.collection}/{${primaryKey}}`;
  }

  return functions.firestore
    .document(rule.source.collection)
    .onDelete((snap, context) => {
      // Get the last {...} in the source collection
      const primaryKeyValue = context.params[primaryKey];
      if (!primaryKeyValue) {
        throw new Error(
          `integrify: Missing a primary key [${primaryKey}] in the source params`
        );
      }

      console.log(
        `integrify: Detected delete in [${rule.source.collection}], id [${primaryKeyValue}]`
      );

      // Call "pre" hook if defined
      const promises = [];
      if (rule.hooks && rule.hooks.pre) {
        promises.push(rule.hooks.pre(snap, context));
        console.log(`integrify: Running pre-hook: ${rule.hooks.pre}`);
      }

      // Loop over each target
      const db = config.config.db;
      rule.targets.forEach(target => {
        // Check delete all flag
        if (!target.deleteAll) {
          target.deleteAll = false;
        }
        // CHeck the foreign key
        if (!target.foreignKey) {
          target.foreignKey = '';
        }

        if (!target.deleteAll && target.foreignKey.trim().length === 0) {
          throw new Error(
            `integrify: missing foreign key or set deleteAll to true`
          );
        }

        // Replace the context.params and snapshot fields in the target collection
        const fieldSwap = replaceReferencesWith(
          { ...snap.data(), ...context.params },
          target.collection
        );
        target.collection = fieldSwap.targetCollection;

        // Delete all docs in this target corresponding to deleted master doc
        let whereable = null;
        if (target.isCollectionGroup) {
          whereable = db.collectionGroup(target.collection);
        } else {
          whereable = db.collection(target.collection);
        }

        if (target.deleteAll) {
          console.log(
            `integrify: Deleting all docs in sub-collection [${target.collection}]`
          );
        } else {
          console.log(
            `integrify: Deleting all docs in collection ${
              target.isCollectionGroup ? 'group ' : ''
            }[${target.collection}] where foreign key [${
              target.foreignKey
            }] matches [${primaryKeyValue}]`
          );

          whereable = whereable.where(target.foreignKey, '==', primaryKeyValue);
        }

        promises.push(
          whereable.get().then(querySnap => {
            querySnap.forEach(doc => {
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
