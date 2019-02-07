const { integrify } = require('./lib');

const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();
db.settings({ timestampsInSnapshots: true });

integrify({ config: { db, functions } });

module.exports.replicateMasterToDetail = integrify({
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
  hooks: {
    pre: (change, context) => {
      console.log(change, context);
    },
  },
});

module.exports.deleteReferencesToMaster = integrify({
  rule: 'DELETE_REFERENCES',
  source: {
    collection: 'master',
  },
  targets: [
    {
      collection: 'detail1',
      foreignKey: 'masterId',
    },
  ],
});

[
  module.exports.incrementFavoritesCount,
  module.exports.decrementFavoritesCount,
] = integrify({
  rule: 'MAINTAIN_COUNT',
  source: {
    collection: 'favorites',
    foreignKey: 'articleId',
  },
  target: {
    collection: 'articles',
    attribute: 'favoritesCount',
  },
});
