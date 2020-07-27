const { setState } = require('./stateMachine');

module.exports = [
  {
    rule: 'REPLICATE_ATTRIBUTES',
    name: 'replicateMasterToDetail',
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
  },
  {
    rule: 'REPLICATE_ATTRIBUTES',
    name: 'replicateMasterDeleteWhenEmpty',
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
  },
  {
    rule: 'REPLICATE_ATTRIBUTES',
    name: 'replicateReferencesWithMissingKey',
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
  },
  {
    rule: 'DELETE_REFERENCES',
    name: 'deleteReferencesToMaster',
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
  },
  {
    rule: 'DELETE_REFERENCES',
    name: 'deleteReferencesWithMasterParam',
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
  },
  {
    rule: 'DELETE_REFERENCES',
    name: 'deleteReferencesWithSnapshotFields',
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
  },
  {
    rule: 'DELETE_REFERENCES',
    name: 'deleteReferencesWithMissingKey',
    source: {
      collection: 'master',
    },
    targets: [
      {
        collection: 'detail1',
        foreignKey: 'randomId',
      },
    ],
  },
  {
    rule: 'DELETE_REFERENCES',
    name: 'deleteReferencesWithMissingFields',
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
  },
  {
    rule: 'DELETE_REFERENCES',
    name: 'deleteReferencesDeleteAllSubCollections',
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
  },
  {
    rule: 'DELETE_REFERENCES',
    name: 'deleteReferencesDeleteAllSubCollectionErrors',
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
  },
  {
    rule: 'DELETE_REFERENCES',
    name: 'deleteReferencesMissingArgumentsErrors',
    source: {
      collection: 'master/{randomId}',
    },
    targets: [
      {
        collection: 'master/details',
      },
    ],
  },
  {
    rule: 'MAINTAIN_COUNT',
    name: 'maintainFavoritesCount',
    source: {
      collection: 'favorites',
      foreignKey: 'articleId',
    },
    target: {
      collection: 'articles',
      attribute: 'favoritesCount',
    },
  },
];
