const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

const { integrify } = require('../lib');

integrify({ config: { db, functions } });

const result = integrify({
  rule: 'REPLICATE_ATTRIBUTES',
  source: {
    collection: 'master',
  },
  targets: [
    {
      collection: 'detail1',
      foreignKey: 'masterId',
      attributeMapping: {
        masterField1: 'detail1Field1',
        masterField2: 'detail1Field2',
      },
    },
    {
      collection: 'detail2',
      foreignKey: 'masterId',
      attributeMapping: {
        masterField1: 'detail2Field1',
        masterField3: 'detail2Field3',
      },
    },
  ],
});

console.log(result);
console.log(result.name);
