export interface Rule {
  rule: 'REPLICATE_ATTRIBUTES' | 'DELETE_REFERENCES' | 'TODO';
}

export interface Config {
  config: {
    db: FirebaseFirestore.Firestore;
    functions: typeof import('firebase-functions');
  };
}
