# Integrify

## Usage

```js
const integrify = require('integrify');

module.exports = {
  reflectMasterToDetail: integrify({
    rule: 'REFLECT_ATTRIBUTES',
    source: {
      collection: 'master',
    },
    targets: [
      {
        collection: 'detail',
        foreignKey: 'masterId',
        attributes: [
          { from: 'masterField1', to: 'detailField1' },
          { from: 'masterField2', to: 'detailField2' },
        ],
      },
    ],
  }),

  countNumberOfFavorites: integrify({
    rule: 'MAINTAIN_COUNT',
    source: {
      collection: 'favorites',
      foreignKey: 'articleId',
    },
    target: {
      collection: 'articles',
      attribute: 'favoritesCount',
    },
  }),

  deleteReferencesToMaster: integrify({
    rule: 'DELETE_REFERENCES',
    source: {
      collection: 'master',
    },
    targets: [
      {
        collection: 'detail',
        foreignKey: 'masterId',
      },
    ],
  }),
};
```
