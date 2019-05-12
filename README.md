# 𝚒𝚗𝚝𝚎𝚐𝚛𝚒𝚏𝚢

[![Build Status](https://travis-ci.com/anishkny/integrify.svg?branch=master)](https://travis-ci.com/anishkny/integrify)
[![Coverage Status](https://coveralls.io/repos/github/anishkny/integrify/badge.svg?branch=master)](https://coveralls.io/github/anishkny/integrify?branch=master)
[![Greenkeeper badge](https://badges.greenkeeper.io/anishkny/integrify.svg)](https://greenkeeper.io/)
[![Known Vulnerabilities](https://snyk.io/test/github/anishkny/integrify/badge.svg?targetFile=package.json)](https://snyk.io/test/github/anishkny/integrify?targetFile=package.json)
[![npm package](https://img.shields.io/npm/v/integrify.svg)](https://www.npmjs.com/package/integrify)
[![Mentioned in Awesome Firebase](https://awesome.re/mentioned-badge.svg)](https://github.com/jthegedus/awesome-firebase)

🤝 Enforce referential and data integrity in [Cloud Firestore](https://firebase.google.com/docs/firestore/) using [triggers](https://firebase.google.com/docs/functions/firestore-events)

[Introductory blog post](https://dev.to/anishkny/---firestore-referential-integrity-via-triggers-kpb)

## Usage

```js
// index.js

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

  // Optional:
  hooks: {
    pre: (change, context) => {
      // Code to execute before replicating attributes
      // See: https://firebase.google.com/docs/functions/firestore-events
    },
  },
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

  // Optional:
  hooks: {
    pre: (snap, context) => {
      // Code to execute before deleting references
      // See: https://firebase.google.com/docs/functions/firestore-events
    },
  },
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

Deploy to Firebase by executing:

```bash
$ firebase deploy --only functions
```

### Rules File

Alternately, rules can be specified in a file named `integrify.rules.js`.

```js
// index.js

const { integrify } = require('integrify');

const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

integrify({ config: { functions, db } });

// Rules will be loaded from "integrify.rules.js"
module.exports = integrify();
```

```js
// integrify.rules.js

module.exports = [
  {
    rule: 'REPLICATE_ATTRIBUTES',
    name: 'replicateMasterToDetail',
    // ...
  },
  // ...
];
```
