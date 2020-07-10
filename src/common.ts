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

export function replaceReferenceWithMasterId(
  targetRef: string,
  masterId: string
): string {
  return targetRef.replace('{masterId}', masterId);
}

export function replaceReferenceWithFields(
  fields: FirebaseFirestore.DocumentData,
  targetCollection: string
): { hasFields: boolean; targetCollection: string } {
  const pRegex = /\{([^)]+)\}/g;
  const matches = pRegex.exec(targetCollection);
  let hasFields = false;
  if (matches && fields) {
    hasFields = true;
    matches.forEach(() => {
      const field = fields[matches[1]];
      if (field) {
        console.log(
          `integrify: Detected dynamic reference, replacing [${matches[0]}] with [${field}]`
        );
        targetCollection = targetCollection.replace(matches[0], field);
      } else {
        throw new Error(
          `integrify: Missing dynamic reference: [${matches[0]}]`
        );
      }
    });
  }

  return { hasFields, targetCollection };
}
