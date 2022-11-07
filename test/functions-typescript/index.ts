// This file is used only to ensure integrify can be used with TypeScript.
import { integrify } from '../../src/index';

export const replicateAttributes = integrify({
  rule: 'REPLICATE_ATTRIBUTES',
  source: {
    collection: 'users',
  },
  targets: [
    {
      collection: 'profiles',
      foreignKey: 'userId',
      attributeMapping: {
        role: 'role',
      },
    },
  ],
});

export const deleteReferences = integrify({
  rule: 'DELETE_REFERENCES',
  source: {
    collection: 'users',
  },
  targets: [
    {
      collection: 'profiles',
      foreignKey: 'userId',
    },
  ],
});

export const maintainCount = integrify({
  rule: 'MAINTAIN_COUNT',
  source: {
    collection: 'users',
    foreignKey: 'userId',
  },
  target: {
    collection: 'profiles',
    attribute: 'userCount',
  },
});
