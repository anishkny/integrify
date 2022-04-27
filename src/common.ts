import { DeleteReferencesRule } from './rules/deleteReferences';
import { MaintainCountRule } from './rules/maintainCount';
import { ReplicateAttributesRule } from './rules/replicateAttributes';

export type Rule =
  | DeleteReferencesRule
  | MaintainCountRule
  | ReplicateAttributesRule;

export interface Config {
  config: {
    db: FirebaseFirestore.Firestore;
    functions: typeof import('firebase-functions');
  };
}

export function isRule(arg: Rule | Config): arg is Rule {
  return isObject(arg) && 'rule' in arg;
}

export function isConfig(arg: Rule | Config): arg is Config {
  return isObject(arg) && 'config' in arg;
}

function isObject(arg: unknown): boolean {
  return arg !== null && typeof arg === 'object';
}
