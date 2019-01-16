import { Config, isConfig, isRule, Rule } from './common';
import {
  DeleteReferencesRule,
  integrifyDeleteReferences,
  isDeleteReferencesRule,
} from './rules/deleteReferences';
import {
  integrifyMaintainCount,
  isMaintainCountRule,
  MaintainCountRule,
} from './rules/maintainCount';
import {
  integrifyReplicateAttributes,
  isReplicateAttributesRule,
  ReplicateAttributesRule,
} from './rules/replicateAttributes';

export function integrify(config: Config): null;
export function integrify(
  rule: ReplicateAttributesRule | DeleteReferencesRule | MaintainCountRule
): any;
export function integrify(ruleOrConfig: Rule | Config) {
  if (isConfig(ruleOrConfig)) {
    setCurrentConfig(ruleOrConfig);
  } else if (isRule(ruleOrConfig)) {
    if (isReplicateAttributesRule(ruleOrConfig)) {
      return integrifyReplicateAttributes(ruleOrConfig, currentConfig);
    } else if (isDeleteReferencesRule(ruleOrConfig)) {
      return integrifyDeleteReferences(ruleOrConfig, currentConfig);
    } else if (isMaintainCountRule(ruleOrConfig)) {
      return integrifyMaintainCount(ruleOrConfig, currentConfig);
    } else {
      throw new Error(`Unknown rule: [${JSON.stringify(ruleOrConfig)}]`);
    }
  } else {
    throw new Error(
      `Input must be rule or config: [${JSON.stringify(ruleOrConfig)}]`
    );
  }
}

const currentConfig: Config = {
  config: { db: null, functions: null },
};

function setCurrentConfig(aConfig: Config) {
  currentConfig.config.db = aConfig.config.db;
  currentConfig.config.functions = aConfig.config.functions;
}
