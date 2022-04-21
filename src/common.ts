import { DeleteReferencesRule } from './rules/deleteReferences';
import { MaintainCountRule } from './rules/maintainCount';
import { ReplicateAttributesRule } from './rules/replicateAttributes';

export type Rule = { rule: string; name?: string } & (
  | DeleteReferencesRule
  | MaintainCountRule
  | ReplicateAttributesRule
);

export interface Config {
  config: {
    db: FirebaseFirestore.Firestore;
    functions: typeof import('firebase-functions');
  };
}

export function isRule(arg: Rule | Config): arg is Rule {
  return (arg as Rule).rule !== undefined;
}

export function isConfig(arg: Rule | Config): arg is Config {
  return (arg as Config).config !== undefined;
}
