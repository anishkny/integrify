import { Config, Rule } from './common';
import {
  DeleteReferencesRule,
  integrifyDeleteReferences,
  isDeleteReferencesRule,
} from './rules/deleteReferences';
import {
  integrifyReplicateAttributes,
  isReplicateAttributesRule,
  ReplicateAttributesRule,
} from './rules/replicateAttributes';

const config: Config = {
  config: { db: null, functions: null },
};

export function integrify(config: Config): null;
export function integrify(
  rule: ReplicateAttributesRule | DeleteReferencesRule
): any;
export function integrify(ruleOrConfig: Rule | Config) {
  if (isRule(ruleOrConfig)) {
    if (isReplicateAttributesRule(ruleOrConfig)) {
      return integrifyReplicateAttributes(ruleOrConfig, config);
    } else if (isDeleteReferencesRule(ruleOrConfig)) {
      return integrifyDeleteReferences(ruleOrConfig, config);
    } else {
      // TODO: Throw error
    }
  } else if (isConfig) {
    setConfig(ruleOrConfig);
  } else {
    // TODO: Throw error
  }
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
