const { integrify } = require('../../lib');

const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp({}, 'absent-config-file-app');
const db = admin.firestore();

integrify({ config: { db, functions } });

module.exports = integrify(); // Rules will be loaded from "integrify.rules.js"
