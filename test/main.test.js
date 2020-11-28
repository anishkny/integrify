const assert = require('chai').assert;

const { integrify } = require('../lib');

describe('Error conditions', () => {
  it('should error on bad rule', function () {
    assert.throws(
      () => integrify({ rule: 'BAD_RULE_ea8e3a2a2d3e' }),
      /Unknown rule/i
    );
    assert.throws(() => require('./functions-bad-rules-file'), /Unknown rule/i);
  });

  it('should error on no rule or config', function () {
    assert.throws(() => integrify(42), /Input must be rule or config/i);
  });

  it('should error on absent config file', function () {
    assert.throws(
      () => require('./functions-absent-rules-file'),
      /Rules file not found/i
    );
  });
});
