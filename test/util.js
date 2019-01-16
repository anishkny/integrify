module.exports = { getFirebaseCredentials, makeid, sleep };

function getFirebaseCredentials() {
  // TODO: Add ability to get credentials from ENV var
  const serviceAccountKeyFile = `${__dirname}/service-account-key.json`;
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
