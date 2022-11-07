import { Change, CloudFunction } from 'firebase-functions';
import { DocumentSnapshot } from 'firebase-functions/lib/v1/providers/firestore';

import { Config, Rule } from '../common';

export interface ReplicateAttributesRule {
  rule: 'REPLICATE_ATTRIBUTES';
  name?: string;
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
    // eslint-disable-next-line @typescript-eslint/ban-types
    pre?: Function;
  };
}

export function isReplicateAttributesRule(
  arg: Rule
): arg is ReplicateAttributesRule {
  return arg.rule === 'REPLICATE_ATTRIBUTES';
}

export type ReplicateAttributesFunction = CloudFunction<
  Change<DocumentSnapshot>
>;

export function integrifyReplicateAttributes(
  rule: ReplicateAttributesRule,
  config: Config
): ReplicateAttributesFunction {
  const functions = config.config.functions;

  console.log(
    `integrify: Creating function to replicate source collection [${rule.source.collection}]`
  );
  rule.targets.forEach((target) => {
    Object.keys(target.attributeMapping).forEach((sourceAttribute) => {
      console.log(
        `integrify: Replicating [${rule.source.collection}].[${sourceAttribute}] => [${target.collection}].[${target.attributeMapping[sourceAttribute]}]`
      );
    });
  });

  // Create map of master attributes to track for replication
  const trackedMasterAttributes = {};
  rule.targets.forEach((target) => {
    Object.keys(target.attributeMapping).forEach((masterAttribute) => {
      trackedMasterAttributes[masterAttribute] = true;
    });
  });

  return functions.firestore
    .document(`${rule.source.collection}/{masterId}`)
    .onUpdate((change, context) => {
      const masterId = context.params.masterId;
      const newValue = change.after.data();
      const oldValue = change.before.data();
      console.log(
        `integrify: Detected update in [${rule.source.collection}], id [${masterId}], new value:`,
        newValue
      );

      // Call "pre" hook if defined
      const promises = [];
      // istanbul ignore else
      if (rule.hooks && rule.hooks.pre) {
        promises.push(rule.hooks.pre(change, context));
        console.log(`integrify: Running pre-hook: ${rule.hooks.pre}`);
      }

      // Check if atleast one of the attributes to be replicated was changed
      let relevantUpdate = false;
      Object.keys(newValue).forEach((changedAttribute) => {
        if (
          trackedMasterAttributes[changedAttribute] &&
          newValue[changedAttribute] !== oldValue[changedAttribute]
        ) {
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

      // Loop over each target specification to replicate atributes
      const db = config.config.db;
      rule.targets.forEach((target) => {
        const targetCollection = target.collection;
        const update = {};

        // Create "update" mapping each changed attribute from source => target
        Object.keys(newValue).forEach((changedAttribute) => {
          if (target.attributeMapping[changedAttribute]) {
            update[target.attributeMapping[changedAttribute]] =
              newValue[changedAttribute];
          }
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
            .where(target.foreignKey, '==', masterId)
            .get()
            .then((detailDocs) => {
              detailDocs.forEach((detailDoc) => {
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
