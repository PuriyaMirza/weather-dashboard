import nextVitals from 'eslint-config-next/core-web-vitals';

const eslintConfig = [
  ...nextVitals,
  {
    // public/sw.js runs in a ServiceWorkerGlobalScope, not a React tree; the Next rules don't apply.
    ignores: ['.next/**', 'node_modules/**', 'playwright-report/**', 'test-results/**', 'public/sw.js'],
  },
];

export default eslintConfig;
