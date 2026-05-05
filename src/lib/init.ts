import { initializeEventHandlers } from './eventHandlers';

let initialized = false;

export function initApp() {
  if (initialized) return;
  initializeEventHandlers();
  initialized = true;
  console.log('App initialized: Domain event handlers registered.');
}
