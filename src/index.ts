import * as callerPath from 'caller-path';
import { existsSync } from 'fs';
import { dirname, sep } from 'path';

import { Config, isConfig, isRule, Rule } from './common';
import {
  DeleteReferencesFunction,
  DeleteReferencesRule,
  integrifyDeleteReferences,
  isDeleteReferencesRule,
} from './rules/deleteReferences';
import {
  integrifyMaintainCount,
  isMaintainCountRule,
  MaintainCountFunction,
  MaintainCountRule,
} from './rules/maintainCount';
import {
  integrifyReplicateAttributes,
  isReplicateAttributesRule,
  ReplicateAttributesFunction,
  ReplicateAttributesRule,
} from './rules/replicateAttributes';

export type IntegrifyFunction =
  | ReplicateAttributesFunction
  | DeleteReferencesFunction
  | MaintainCountFunction;
export type IntegrifyFunctionSet = { [key: string]: IntegrifyFunction };

export function integrify(config: Config): null;
export function integrify(rule: Rule): IntegrifyFunction;
export function integrify(): IntegrifyFunctionSet;

export function integrify(
  ruleOrConfig?: Rule | Config
): null | IntegrifyFunction | IntegrifyFunctionSet {
  if (!ruleOrConfig) {
    const rules = readRulesFromFile();
    const functions: IntegrifyFunctionSet = {};
    rules.forEach((thisRule) => {
      if (
        isReplicateAttributesRule(thisRule) ||
        isDeleteReferencesRule(thisRule) ||
        isMaintainCountRule(thisRule)
      ) {
        functions[thisRule.name] = integrify(thisRule as Rule);
      } else {
        throw new Error(
          `integrify: Unknown rule: [${JSON.stringify(thisRule)}]`
        );
      }
    });
    return functions;
  } else if (isConfig(ruleOrConfig)) {
    setCurrentConfig(ruleOrConfig);
  } else if (isRule(ruleOrConfig)) {
    if (isReplicateAttributesRule(ruleOrConfig)) {
      return integrifyReplicateAttributes(
        ruleOrConfig as ReplicateAttributesRule,
        currentConfig
      );
    } else if (isDeleteReferencesRule(ruleOrConfig)) {
      return integrifyDeleteReferences(
        ruleOrConfig as DeleteReferencesRule,
        currentConfig
      );
    } else if (isMaintainCountRule(ruleOrConfig)) {
      return integrifyMaintainCount(
        ruleOrConfig as MaintainCountRule,
        currentConfig
      );
    } else {
      throw new Error(
        `integrify: Unknown rule: [${JSON.stringify(ruleOrConfig)}]`
      );
    }
  } else {
    throw new Error(
      `integrify: Input must be rule or config: [${JSON.stringify(
        ruleOrConfig
      )}]`
    );
  }
}

/**
 * readRulesFromFile - Read array of `integrify` configurations from
 * `integrify.rules.js`
 */
function readRulesFromFile() {
  const cp = callerPath();
  const rulesFile = `${dirname(cp)}${sep}integrify.rules.js`;
  if (!existsSync(rulesFile)) {
    throw new Error(`integrify: Rules file not found: [${rulesFile}]`);
  }
  return require(rulesFile);
}

const currentConfig: Config = {
  config: { db: null, functions: null },
};

function setCurrentConfig(aConfig: Config) {
  currentConfig.config.db = aConfig.config.db;
  currentConfig.config.functions = aConfig.config.functions;
}
