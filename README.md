# 𝚒𝚗𝚝𝚎𝚐𝚛𝚒𝚏𝚢

[![Build Status](https://travis-ci.com/anishkny/integrify.svg?branch=master)](https://travis-ci.com/anishkny/integrify)
[![Coverage Status](https://coveralls.io/repos/github/anishkny/integrify/badge.svg?branch=master)](https://coveralls.io/github/anishkny/integrify?branch=master)
[![Greenkeeper badge](https://badges.greenkeeper.io/anishkny/integrify.svg)](https://greenkeeper.io/)
[![Security](https://img.shields.io/badge/security-GitHub-blue)](https://github.com/anishkny/integrify/network/alerts)
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

      // Optional:
      isCollectionGroup: true, // Replicate into collection group, see more below
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

      // Optional:
      isCollectionGroup: true, // Delete from collection group, see more below
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

### Collection Groups (`isCollectionGroup`)

Firestore allows searching over multiple collections (a.k.a. collection group) with the same name at any level in the database. This is called a [collection group query](https://firebase.google.com/docs/firestore/query-data/queries#collection-group-query).

Integrify allows you to replicate tracked master attributes into (optionally) collection groups linked by a foreign key using the `isCollectionGroup` parameter (see above) in the `REPLICATE_ATTRIBUTES` rule. Similarly, you can delete references in a collection group (instead of just a collection) using the `isCollectionGroup` in the `DELETE_REFERENCES` rule.

**Note:** You need to first create the appropriate index to be able to use Collection Group Queries. The first time you attempt to use it, Firebase will throw an error message with a link which when clicked will prompt you to create the appropriate index. For example:

```
The query requires a COLLECTION_GROUP_ASC index for collection detail1 and field masterId. You can create it here: https://console.firebase.google.com/project/integrify-dev/database/firestore/indexes/single_field?create_exemption=ClNwcm9qZWNxxxxxx3RlcklkEAE
```

For more help, see [here](https://firebase.google.com/docs/firestore/query-data/indexing).
