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

export function isRule(arg: Rule | Config): arg is Rule {
  return (arg as Rule).rule !== undefined;
}

export function isConfig(arg: Rule | Config): arg is Config {
  return (arg as Config).config !== undefined;
}

export function replaceReferenceWithFields(
  fields: FirebaseFirestore.DocumentData,
  targetCollection: string
): { hasFields: boolean; targetCollection: string } {
  const pRegex = /([\$][^\/]*|$)/g;
  const matches = targetCollection.match(pRegex); // Using global flag always returns an empty string at the end
  matches.pop();

  let hasFields = false;
  if (matches.length > 0 && fields) {
    hasFields = true;
    matches.forEach(match => {
      const field = fields[match.replace('$', '')];
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
