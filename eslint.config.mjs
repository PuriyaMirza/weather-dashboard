import nextVitals from 'eslint-config-next/core-web-vitals';

const eslintConfig = [
  ...nextVitals,
  {
    ignores: ['.next/**', 'node_modules/**', 'playwright-report/**', 'test-results/**', '.claude/**'],
  },
];

export default eslintConfig;
