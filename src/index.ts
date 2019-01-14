export interface ReplicateAttributesRule extends Rule {
  source: {
    collection: string;
  };
  targets: Array<{
    collection: string;
    foreignKey: string;
    attributeMapping: {
      [sourceAttribute: string]: string;
    };
  }>;
}

interface Rule {
  rule: 'REPLICATE_ATTRIBUTES' | 'TODO';
}

export interface Config {
  config: {
    db: FirebaseFirestore.Firestore;
    functions: typeof import('firebase-functions');
  };
}

const config: Config = {
  config: { db: null, functions: null },
};

export function integrify(config: Config): null;
export function integrify(rule: ReplicateAttributesRule): any;
export function integrify(ruleOrConfig: Rule | Config) {
  if (isRule(ruleOrConfig)) {
    if (isReplicateAttributesRule(ruleOrConfig)) {
      return integrifyReplicateAttributes(ruleOrConfig);
    }
  } else if (isConfig) {
    setConfig(ruleOrConfig);
  } else {
    // TODO: Throw error
  }
}

function integrifyReplicateAttributes(rule: ReplicateAttributesRule) {
  const functions = config.config.functions;

  rule.targets.forEach(target => {
    Object.keys(target.attributeMapping).forEach(sourceAttribute => {
      console.log(
        `integrify: Replicating [${
          rule.source.collection
        }].[${sourceAttribute}] => [${target.collection}].[${
          target.attributeMapping[sourceAttribute]
        }]`
      );
    });
  });

  return functions.firestore
    .document(`${rule.source.collection}/{masterId}`)
    .onUpdate((change, context) => {
      const newValue = change.after.data();

      // Check if atleast one of the attributes to be replicated was changed
      const trackedMasterAttributes = {};
      rule.targets.forEach(target => {
        Object.keys(target.attributeMapping).forEach(masterAttribute => {
          trackedMasterAttributes[masterAttribute] = true;
        });
      });
      let relevantUpdate = false;
      Object.keys(newValue).forEach(changedAttribute => {
        if (trackedMasterAttributes[changedAttribute]) {
          relevantUpdate = true;
        }
      });
      if (!relevantUpdate) {
        return null;
      }

      // Loop over each target specification to replicate atributes
      const masterId = context.params.masterId;
      const db = config.config.db;
      const promises = [];
      rule.targets.forEach(target => {
        const targetCollection = target.collection;
        const update = {};

        // Create "update" mapping each changed attribute from source => target
        Object.keys(newValue).forEach(changedAttribute => {
          if (target.attributeMapping[changedAttribute]) {
            update[target.attributeMapping[changedAttribute]] =
              newValue[changedAttribute];
          }
        });

        // For each doc in targetCollection where foreignKey matches master.id,
        // apply "update" computed above
        promises.push(
          db
            .collection(targetCollection)
            .where(target.foreignKey, '==', masterId)
            .get()
            .then(detailDocs => {
              detailDocs.forEach(detailDoc => {
                promises.push(
                  db
                    .collection(target.collection)
                    .doc(detailDoc.id)
                    .update(update)
                );
              });
            })
        );

        Object.keys(target.attributeMapping).forEach(sourceAttribute => {
          console.log(
            `integrify: Replicating from [${
              rule.source.collection
            }].[${sourceAttribute}] => [${target.collection}].[${
              target.attributeMapping[sourceAttribute]
            }]`
          );
          // TODO
        });
      });

      return Promise.all(promises);
    });
}

function setConfig(aConfig: Config) {
  config.config.db = aConfig.config.db;
  config.config.functions = aConfig.config.functions;
}

function isRule(arg: Rule | Config): arg is Rule {
  return (arg as Rule).rule !== undefined;
}

function isConfig(arg: Rule | Config): arg is Config {
  return (arg as Config).config !== undefined;
}

function isReplicateAttributesRule(arg: Rule): arg is ReplicateAttributesRule {
  return arg.rule === 'REPLICATE_ATTRIBUTES';
}
