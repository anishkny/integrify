const fs = require('fs');

module.exports = { getFirebaseCredentials, makeid, sleep };

function getFirebaseCredentials() {
  const serviceAccountKeyFile = `${__dirname}/service-account-key.json`;

  // If service account key file does not exist, get it from env var
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

  return [
    { projectId: require(serviceAccountKeyFile).project_id },
    serviceAccountKeyFile,
  ];
}

function makeid() {
  return Math.random()
    .toString(36)
    .substr(2);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
