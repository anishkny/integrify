module.exports = [
  {
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
  },
];
