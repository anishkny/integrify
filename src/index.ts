import { Config, isConfig, isRule, Rule } from './common';
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

const currentConfig: Config = {
  config: { db: null, functions: null },
};

export function integrify(config: Config): null;
export function integrify(
  rule: ReplicateAttributesRule | DeleteReferencesRule
): any;
export function integrify(ruleOrConfig: Rule | Config) {
  if (isConfig(ruleOrConfig)) {
    setCurrentConfig(ruleOrConfig);
  } else if (isRule(ruleOrConfig)) {
    if (isReplicateAttributesRule(ruleOrConfig)) {
      return integrifyReplicateAttributes(ruleOrConfig, currentConfig);
    } else if (isDeleteReferencesRule(ruleOrConfig)) {
      return integrifyDeleteReferences(ruleOrConfig, currentConfig);
    } else {
      // TODO: Throw error
    }
  } else {
    // TODO: Throw error
  }
}

function setCurrentConfig(aConfig: Config) {
  currentConfig.config.db = aConfig.config.db;
  currentConfig.config.functions = aConfig.config.functions;
}
