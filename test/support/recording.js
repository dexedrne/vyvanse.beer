import { ACTIONS } from '../../src/ask/actions.js';

// The bounded live probe compares the overlapping zombie editions. Pad absent options with
// zero only in replay fixtures; the production route requires the provider's full catalogue.
export function replayAnswer(recorded) {
  const action = recorded.response.answers.action;
  return { ...recorded.response, answers: { action: { ...action,
    probabilities: { ...Object.fromEntries(ACTIONS.map(a => [a.id, 0])), ...action.probabilities } } } };
}
