const { integrify } = require('../../lib');
const { setState } = require('./stateMachine');

const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp({}, 'test-app');
const db = admin.firestore();

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
      isCollectionGroup: true,
    },
  ],
  hooks: {
    pre: (change, context) => {
      setState({ change, context });
    },
  },
});

module.exports.replicateMasterDeleteWhenEmpty = integrify({
  rule: 'REPLICATE_ATTRIBUTES',
  source: {
    collection: 'master/{primaryKey}',
  },
  targets: [
    {
      collection: 'detail1',
      foreignKey: 'tempId',
      attributeMapping: {
        masterDetail1: 'foreignDetail1',
        masterDetail2: 'foreignDetail2',
      },
    },
  ],
  hooks: {
    pre: (change, context) => {
      setState({
        change,
        context,
      });
    },
  },
});

module.exports.replicateReferencesWithMissingKey = integrify({
  rule: 'REPLICATE_ATTRIBUTES',
  source: {
    collection: 'master/{masterId}',
  },
  targets: [
    {
      collection: 'detail1',
      foreignKey: 'randomId',
      attributeMapping: {
        masterDetail1: 'foreignDetail1',
      },
    },
  ],
  hooks: {
    pre: (snap, context) => {
      setState({
        snap,
        context,
      });
    },
  },
});

module.exports.deleteReferencesToMaster = integrify({
  rule: 'DELETE_REFERENCES',
  source: {
    collection: 'master/{masterId}',
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

module.exports.deleteReferencesWithMasterParam = integrify({
  rule: 'DELETE_REFERENCES',
  source: {
    collection: 'master/{primaryKey}',
  },
  targets: [
    {
      collection: 'detail1',
      foreignKey: 'primaryKey',
    },
    {
      collection: 'somecoll/$primaryKey/detail2',
      foreignKey: 'primaryKey',
    },
  ],
  hooks: {
    pre: (snap, context) => {
      setState({
        snap,
        context,
      });
    },
  },
});

module.exports.deleteReferencesWithSnapshotFields = integrify({
  rule: 'DELETE_REFERENCES',
  source: {
    collection: 'master/{anotherId}',
  },
  targets: [
    {
      collection: 'detail1',
      foreignKey: 'anotherId',
    },
    {
      collection: 'somecoll/$source.testId/detail2',
      foreignKey: 'anotherId',
    },
  ],
  hooks: {
    pre: (snap, context) => {
      setState({
        snap,
        context,
      });
    },
  },
});

module.exports.deleteReferencesWithMissingKey = integrify({
  rule: 'DELETE_REFERENCES',
  source: {
    collection: 'master',
  },
  targets: [
    {
      collection: 'detail1',
      foreignKey: 'randomId',
    },
  ],
  hooks: {
    pre: (snap, context) => {
      setState({
        snap,
        context,
      });
    },
  },
});

module.exports.deleteReferencesWithMissingFields = integrify({
  rule: 'DELETE_REFERENCES',
  source: {
    collection: 'master/{randomId}',
  },
  targets: [
    {
      collection: 'detail1',
      foreignKey: 'randomId',
    },
    {
      collection: 'somecoll/$source.testId/detail2',
      foreignKey: 'randomId',
    },
  ],
  hooks: {
    pre: (snap, context) => {
      setState({
        snap,
        context,
      });
    },
  },
});

module.exports.deleteReferencesDeleteAllSubCollections = integrify({
  rule: 'DELETE_REFERENCES',
  source: {
    collection: 'master/{randomId}',
  },
  targets: [
    {
      collection: 'somecoll/$source.testId/detail2',
      foreignKey: 'randomId',
      deleteAll: true,
    },
  ],
  hooks: {
    pre: (snap, context) => {
      setState({
        snap,
        context,
      });
    },
  },
});

module.exports.deleteReferencesDeleteAllSubCollectionErrors = integrify({
  rule: 'DELETE_REFERENCES',
  source: {
    collection: 'master/{randomId}',
  },
  targets: [
    {
      collection: 'master/details',
      foreignKey: 'randomId',
      deleteAll: true,
    },
  ],
  hooks: {
    pre: (snap, context) => {
      setState({
        snap,
        context,
      });
    },
  },
});

module.exports.deleteReferencesMissingArgumentsErrors = integrify({
  rule: 'DELETE_REFERENCES',
  source: {
    collection: 'master/{randomId}',
  },
  targets: [
    {
      collection: 'master/details',
    },
  ],
  hooks: {
    pre: (snap, context) => {
      setState({
        snap,
        context,
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
