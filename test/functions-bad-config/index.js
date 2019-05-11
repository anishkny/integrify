const { integrify } = require('../../lib');

const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp({}, 'bad-rule-from-file-app');
const db = admin.firestore();

integrify({ config: { db, functions } });

module.exports = integrify(); // Rules will be loaded from "integrify.rules.js"
