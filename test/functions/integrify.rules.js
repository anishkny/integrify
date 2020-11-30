module.exports = [
  {
    rule: 'REPLICATE_ATTRIBUTES',
    name: 'replicateMasterToDetailFromFile',
    source: {
      collection: 'rules-file-master',
    },
    targets: [
      {
        collection: 'rules-file-detail1',
        foreignKey: 'masterId',
        attributeMapping: {
          masterField1: 'detail1Field1',
          masterField2: 'detail1Field2',
        },
      },
      {
        collection: 'rules-file-detail2',
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
    name: 'deleteReferencesToMasterFromFile',
    source: {
      collection: 'rules-file-master',
    },
    targets: [
      {
        collection: 'rules-file-detail1',
        foreignKey: 'masterId',
      },
      {
        collection: 'rules-file-detail2',
        foreignKey: 'masterId',
        isCollectionGroup: true,
      },
    ],
  },
  {
    rule: 'MAINTAIN_COUNT',
    name: 'maintainFavoritesCountFromFile',
    source: {
      collection: 'rules-file-favorites',
      foreignKey: 'articleId',
    },
    target: {
      collection: 'rules-file-articles',
      attribute: 'favoritesCount',
    },
  },
];
