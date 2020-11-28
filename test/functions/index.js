const { integrify } = require('../../lib');
const { setState } = require('./stateMachine');

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
    pre: (change, context) => {
      setState({ change, context });
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
    pre: (snap, context) => {
      setState({ snap, context });
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
