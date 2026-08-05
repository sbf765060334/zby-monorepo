import antfu from '@antfu/eslint-config'
import reactHooks from 'eslint-plugin-react-hooks'

export default antfu(
  {
    lessOpinionated: true,
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/.vite/**',
      '**/.turbo/**',
      '**/.cache/**',
      '**/*.d.ts',
    ],
    javascript: {
      overrides: {
        curly: 'off',
      },
    },
    imports: {
      overrides: {
        'import/consistent-type-specifier-style': 'off',
      },
    },
    jsonc: false,
    markdown: false,
    perfectionist: false,
    pnpm: false,
    regexp: false,
    test: false,
    toml: false,
    yaml: false,
    stylistic: {
      indent: 2,
      quotes: 'single',
      semi: false,
      jsx: true,
      braceStyle: '1tbs',
      overrides: {
        'style/arrow-parens': ['error', 'always'],
        'style/indent-binary-ops': 'off',
        'style/jsx-curly-newline': 'off',
        'style/jsx-one-expression-per-line': 'off',
        'style/linebreak-style': ['error', 'unix'],
        'style/member-delimiter-style': 'off',
        'style/multiline-ternary': 'off',
        'style/operator-linebreak': [
          'error',
          'after',
          {
            overrides: {
              ':': 'before',
              '?': 'before',
              '|': 'before',
            },
          },
        ],
        'style/quote-props': ['error', 'as-needed'],
      },
    },
    typescript: {
      overrides: {
        'ts/consistent-type-definitions': 'off',
        'ts/consistent-type-imports': [
          'warn',
          {
            prefer: 'type-imports',
            fixStyle: 'inline-type-imports',
          },
        ],
        'ts/no-unused-vars': [
          'warn',
          {
            argsIgnorePattern: '^_',
            caughtErrorsIgnorePattern: '^_',
            varsIgnorePattern: '^_',
          },
        ],
      },
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      curly: 'off',
    },
  },
  {
    // Keep Ant Design 6.5.3 Table's upstream hook and development-warning
    // patterns intact inside the source fork.
    files: ['packages/zby-ui/src/components/table/**/*.{ts,tsx}'],
    rules: {
      'node/prefer-global/process': 'off',
      'react-hooks/exhaustive-deps': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'ts/no-non-null-asserted-optional-chain': 'off',
    },
  },
)
