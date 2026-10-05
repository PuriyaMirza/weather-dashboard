import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// React Testing Library does not auto-clean when globals are enabled via config rather than
// its own auto-setup entry point, so unmount between tests to keep the DOM isolated.
afterEach(() => {
  cleanup();
});
