export interface ReflectAttributesRule extends Rule {
  source: {
    collection: string;
  };
  targets: Array<{
    collection: string;
    foreignKey: string;
    attributes: Array<{
      from: string;
      to: string;
    }>;
  }>;
}

interface Rule {
  rule: 'REFLECT_ATTRIBUTES' | 'OTHER';
}

export interface Config {
  config: {
    db: any;
    functions: any;
  };
}

const config: Config = {
  config: { db: null, functions: null },
};

export default function integrify(ruleOrConfig: Rule | Config) {
  if (isRule(ruleOrConfig)) {
    if (isReflectAttributesRule(ruleOrConfig)) {
      return integrifyReflectAttributes(ruleOrConfig);
    }
  } else if (isConfig) {
    setConfig(ruleOrConfig);
  } else {
    // TODO: Throw error
  }
}

function integrifyReflectAttributes(rule: ReflectAttributesRule) {
  const functions = config.config.functions;
  return functions.firestore
    .document(rule.source.collection)
    .onUpdate((snap, context) => {
      // TODO
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

function isReflectAttributesRule(arg: Rule): arg is ReflectAttributesRule {
  return arg.rule === 'REFLECT_ATTRIBUTES';
}
