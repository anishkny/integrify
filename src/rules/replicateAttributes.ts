import { Config, Rule, getPrimaryKey } from '../common';
import { firestore } from 'firebase-admin';
const FieldValue = firestore.FieldValue;

export interface ReplicateAttributesRule extends Rule {
  source: {
    collection: string;
  };
  targets: {
    collection: string;
    foreignKey: string;
    attributeMapping: {
      [sourceAttribute: string]: string;
    };
    isCollectionGroup?: boolean;
  }[];
  hooks?: {
    pre?: Function;
  };
}

export function isReplicateAttributesRule(
  arg: Rule
): arg is ReplicateAttributesRule {
  return arg.rule === 'REPLICATE_ATTRIBUTES';
}

export function integrifyReplicateAttributes(
  rule: ReplicateAttributesRule,
  config: Config
) {
  const functions = config.config.functions;

  console.log(
    `integrify: Creating function to replicate source collection [${rule.source.collection}]`
  );
  rule.targets.forEach(target => {
    Object.keys(target.attributeMapping).forEach(sourceAttribute => {
      console.log(
        `integrify: Replicating [${rule.source.collection}].[${sourceAttribute}] => [${target.collection}].[${target.attributeMapping[sourceAttribute]}]`
      );
    });
  });

  const { hasPrimaryKey, primaryKey } = getPrimaryKey(rule.source.collection);
  if (!hasPrimaryKey) {
    rule.source.collection = `${rule.source.collection}/{${primaryKey}}`;
  }

  // Create map of master attributes to track for replication
  const trackedMasterAttributes = {};
  rule.targets.forEach(target => {
    Object.keys(target.attributeMapping).forEach(masterAttribute => {
      trackedMasterAttributes[masterAttribute] = true;
    });
  });

  return functions.firestore
    .document(rule.source.collection)
    .onUpdate((change, context) => {
      // Get the last {...} in the source collection
      const primaryKeyValue = context.params[primaryKey];
      if (!primaryKeyValue) {
        throw new Error(
          `integrify: Missing a primary key [${primaryKey}] in the source params`
        );
      }
      const newValue = change.after.data();
      console.log(
        `integrify: Detected update in [${rule.source.collection}], id [${primaryKeyValue}], new value:`,
        newValue
      );

      // Call "pre" hook if defined
      const promises = [];
      if (rule.hooks && rule.hooks.pre) {
        promises.push(rule.hooks.pre(change, context));
        console.log(`integrify: Running pre-hook: ${rule.hooks.pre}`);
      }

      // Check if atleast one of the attributes to be replicated was changed
      let relevantUpdate = false;
      Object.keys(newValue).forEach(changedAttribute => {
        if (trackedMasterAttributes[changedAttribute]) {
          relevantUpdate = true;
        }
      });
      if (!relevantUpdate) {
        console.log(
          `integrify: No relevant updates found for replication:`,
          newValue
        );
        return null;
      }

      // Loop over each target specification to replicate attributes
      const db = config.config.db;
      rule.targets.forEach(target => {
        const targetCollection = target.collection;
        const update = {};

        // Create "update" mapping each changed attribute from source => target,
        // if delete is set delete field
        Object.keys(target.attributeMapping).forEach(changedAttribute => {
          update[target.attributeMapping[changedAttribute]] =
            newValue[changedAttribute] || FieldValue.delete();
        });

        console.log(
          `integrify: On collection ${
            target.isCollectionGroup ? 'group ' : ''
          }[${target.collection}], applying update:`,
          update
        );

        // For each doc in targetCollection where foreignKey matches master.id,
        // apply "update" computed above
        let whereable = null;
        if (target.isCollectionGroup) {
          whereable = db.collectionGroup(targetCollection);
        } else {
          whereable = db.collection(targetCollection);
        }
        promises.push(
          whereable
            .where(target.foreignKey, '==', primaryKeyValue)
            .get()
            .then(detailDocs => {
              detailDocs.forEach(detailDoc => {
                console.log(
                  `integrify: On collection ${
                    target.isCollectionGroup ? 'group ' : ''
                  }[${target.collection}], id [${
                    detailDoc.id
                  }], applying update:`,
                  update
                );
                promises.push(detailDoc.ref.update(update));
              });
            })
        );
      });

      return Promise.all(promises);
    });
}
