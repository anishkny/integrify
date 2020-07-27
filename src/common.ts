import { firestore, Change } from 'firebase-functions';
import * as functions from 'firebase-functions';
import {
  DocumentSnapshot,
  QueryDocumentSnapshot,
} from 'firebase-functions/lib/providers/firestore';

export interface Rule {
  rule: 'REPLICATE_ATTRIBUTES' | 'DELETE_REFERENCES' | 'MAINTAIN_COUNT';
  name?: string;
}

export interface Config {
  config: {
    db: FirebaseFirestore.Firestore;
    functions: typeof import('firebase-functions');
  };
}

export type PreHookFunction = (
  change: DocumentSnapshot | Change<QueryDocumentSnapshot>,
  context: functions.EventContext
) => Promise<void> | void;

export function isRule(arg: Rule | Config): arg is Rule {
  return (arg as Rule).rule !== undefined;
}

export function isConfig(arg: Rule | Config): arg is Config {
  return (arg as Config).config !== undefined;
}

enum Key {
  Primary = '{(.*?)}',
  Foreign = '([$][^/]*|$)',
}

function regexMatches(text: string, regex: Key): string[] {
  return text.match(new RegExp(regex, 'g')) || [];
}

function containsSource(text: string): boolean {
  return text.includes('$source.');
}

function removeVariableToken(text: string, source: boolean): string {
  return source ? text.replace('$source.', '') : text.replace('$', '');
}

export function getPrimaryKey(
  ref: string
): { hasPrimaryKey: boolean; primaryKey: string } {
  const keys = regexMatches(ref, Key.Primary);
  if (keys.length > 0) {
    const pk = keys.pop(); // Pop the last item in the matched array
    // Remove { } from the primary key
    return { hasPrimaryKey: true, primaryKey: pk.replace(/\{|\}/g, '') };
  }
  return { hasPrimaryKey: false, primaryKey: 'masterId' };
}

export function replaceReferencesWith(
  fields: FirebaseFirestore.DocumentData,
  targetCollection: string
): { hasFields: boolean; targetCollection: string } {
  const matches = regexMatches(targetCollection, Key.Foreign);
  matches.pop(); // The foreign key regex always return '' at the end
  let hasFields = false;
  if (matches.length > 0 && fields) {
    hasFields = true;
    matches.forEach(match => {
      const isSourceField = containsSource(match);
      const cleanedIndex = removeVariableToken(match, isSourceField);

      const field = isSourceField
        ? fields.source[cleanedIndex]
        : fields[cleanedIndex];
      if (field) {
        console.log(
          `integrify: Detected dynamic reference, replacing [${match}] with [${field}]`
        );
        targetCollection = targetCollection.replace(match, field);
      } else {
        throw new Error(`integrify: Missing dynamic reference: [${match}]`);
      }
    });
  }

  return { hasFields, targetCollection };
}
