import * as callerPath from 'caller-path';
import { existsSync } from 'fs';
import { dirname, sep } from 'path';
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
export function integrify(ruleOrConfig?: Rule | Config) {
  if (!ruleOrConfig) {
    const rules = readRulesFromFile();
    const functions = {};
    rules.forEach(thisRule => {
      if (
        isReplicateAttributesRule(thisRule) ||
        isDeleteReferencesRule(thisRule)
      ) {
        functions[thisRule.name] = integrify(thisRule);
      } else if (isMaintainCountRule(thisRule)) {
        [
          functions[`increment${thisRule.name}`],
          functions[`decrement${thisRule.name}`],
        ] = integrify(thisRule);
      } else {
        throw new Error(`Unknown rule: [${JSON.stringify(thisRule)}]`);
      }
    });
    return functions;
  } else if (isConfig(ruleOrConfig)) {
    setCurrentConfig(ruleOrConfig);
  } else if (isRule(ruleOrConfig)) {
    ensureCurrentConfig();
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

/**
 * ensureCurrentConfig - Check if `currentConfig` is defined, if not use default
 * values
 */
function ensureCurrentConfig() {
  if (!currentConfig.config.db) {
    const admin = require('firebase-admin');
    admin.initializeApp();
    currentConfig.config.db = admin.firestore();
  }
  if (!currentConfig.config.functions) {
    currentConfig.config.functions = require('firebase-functions');
  }
}

const currentConfig: Config = {
  config: { db: null, functions: null },
};

function setCurrentConfig(aConfig: Config) {
  currentConfig.config.db = aConfig.config.db;
  currentConfig.config.functions = aConfig.config.functions;
}
