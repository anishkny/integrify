const { integrify } = require('../../lib');

const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

integrify({ config: { db, functions } });

// Specify rules in situ
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
      isCollectionGroup: true,
    },
  ],
  hooks: {
    pre: async (change, context) => {
      await db.collection('prehooks').add({
        message: '[788a32e05504] REPLICATE_ATTRIBUTES prehook was called!',
      });
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
    {
      collection: 'detail2',
      foreignKey: 'masterId',
      isCollectionGroup: true,
    },
  ],
  hooks: {
    pre: async (snap, context) => {
      await db.collection('prehooks').add({
        message: '[6a8f4f8f090c] DELETE_REFERENCES prehook was called!',
      });
    },
  },
});

module.exports.maintainFavoritesCount = integrify({
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

// Specify rules from "./integrify.rules.js"
const rulesFromFiles = integrify();
