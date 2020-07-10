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
    rule: 'DELETE_REFERENCES',
    name: 'deleteReferencesToMaster',
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
  },
  {
    rule: 'DELETE_REFERENCES',
    name: 'deleteReferencesWithMasterParam',
    source: {
      collection: 'master',
    },
    targets: [
      {
        collection: 'detail1',
        foreignKey: 'masterId',
      },
      {
        collection: 'somecoll/{masterId}/detail2',
        foreignKey: 'masterId',
      },
    ],
  },
  {
    rule: 'DELETE_REFERENCES',
    name: 'deleteReferencesWithSnapshotFields',
    source: {
      collection: 'master',
    },
    targets: [
      {
        collection: 'detail1',
        foreignKey: 'masterId',
      },
      {
        collection: 'somecoll/{testId}/detail2',
        foreignKey: 'masterId',
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
