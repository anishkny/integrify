# 𝚒𝚗𝚝𝚎𝚐𝚛𝚒𝚏𝚢

[![Build Status](https://travis-ci.com/anishkny/integrify.svg?branch=master)](https://travis-ci.com/anishkny/integrify)
[![Coverage Status](https://coveralls.io/repos/github/anishkny/integrify/badge.svg?branch=master)](https://coveralls.io/github/anishkny/integrify?branch=master)
[![Known Vulnerabilities](https://snyk.io/test/github/anishkny/integrify/badge.svg?targetFile=package.json)](https://snyk.io/test/github/anishkny/integrify?targetFile=package.json)
[![npm package](https://img.shields.io/npm/v/integrify.svg)](https://www.npmjs.com/package/integrify)

🤝 Enforce referential and data integrity in [Cloud Firestore](https://firebase.google.com/docs/firestore/) using [triggers](https://firebase.google.com/docs/functions/firestore-events)

## Usage

```js
const { integrify } = require('integrify');

const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

integrify({ config: { functions, db } });

// Automatically replicate attributes from source to target
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
});

// Automatically delete stale references
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

// Automatically maintain count
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
```
