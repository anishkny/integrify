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
    hooks: {
      pre: (change, context) => {
        setState({ change, context });
      },
    },
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
    hooks: {
      pre: (snap, context) => {
        setState({ snap, context });
      },
    },
  },
  {
    rule: 'MAINTAIN_COUNT',
    name: 'FavoritesCount',
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
