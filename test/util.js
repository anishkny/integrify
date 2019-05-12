const fs = require('fs');

// Setup test account credentials from env var/file
const serviceAccountKeyFile = `${__dirname}/service-account-key.json`;
if (!fs.existsSync(serviceAccountKeyFile)) {
  const SERVICE_ACCOUNT_KEY_BASE64 = process.env.SERVICE_ACCOUNT_KEY_BASE64;
  if (!SERVICE_ACCOUNT_KEY_BASE64) {
    throw new Error(
      'Either test/service-account-key.json or env var SERVICE_ACCOUNT_KEY_BASE64 must be provided.'
    );
  }
  fs.writeFileSync(
    serviceAccountKeyFile,
    new Buffer(SERVICE_ACCOUNT_KEY_BASE64, 'base64').toString()
  );
}

const credentials = {
  projectId: require(serviceAccountKeyFile).project_id,
  certificate: require(serviceAccountKeyFile),
  serviceAccountKeyFile,
};

function makeid() {
  return Math.random()
    .toString(36)
    .substr(2);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { credentials, makeid, sleep };
