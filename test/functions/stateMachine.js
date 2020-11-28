const state = {};
const getState = () => state;
const setState = (newState) => Object.assign(state, newState);
module.exports = { getState, setState };
