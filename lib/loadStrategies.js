/**
 * Loading strategies
 */

import * as strategies from './strategies/index.js';

const IGNORED_STRATEGIES = new Set(['immediate', 'eager']);

function parseRequirements(strategy) {
  if (!strategy) {
    return [];
  }

  return strategy
    .split('|')
    .map(requirement => requirement.trim())
    .filter(Boolean)
    .filter(requirement => !IGNORED_STRATEGIES.has(requirement));
}

function resolveStrategy(requirement, selector) {
  if (requirement.startsWith('event')) {
    return strategies.event(requirement);
  }

  if (requirement === 'idle') {
    return strategies.idle();
  }

  if (requirement.startsWith('media')) {
    return strategies.media(requirement);
  }

  if (requirement.startsWith('visible')) {
    return strategies.visible(selector, requirement);
  }

  return null;
}

export function loadStrategies(strategy, selector) {
  return parseRequirements(strategy)
    .map(requirement => resolveStrategy(requirement, selector))
    .filter(Boolean);
}