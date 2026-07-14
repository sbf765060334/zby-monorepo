import js from '@eslint/js'
import stylistic from '@stylistic/eslint-plugin'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'
import tseslint from 'typescript-eslint'

const localPlugin = {
  rules: {
    'object-expression-brace-same-line': {
      meta: {
        type: 'layout',
        fixable: 'whitespace',
        schema: [],
        messages: {
          sameLine: 'Place the object opening brace on the same line as the assignment.',
        },
      },
      create(context) {
        const sourceCode = context.sourceCode

        return {
          ObjectExpression(node) {
            const { parent } = node
            const isAssignedObject =
              (parent.type === 'VariableDeclarator' && parent.init === node) ||
              (parent.type === 'AssignmentExpression' && parent.right === node) ||
              (parent.type === 'AssignmentPattern' && parent.right === node) ||
              (parent.type === 'PropertyDefinition' && parent.value === node)

            if (!isAssignedObject) return

            const openBrace = sourceCode.getFirstToken(node)
            const assignment = openBrace && sourceCode.getTokenBefore(openBrace)

            if (
              !openBrace ||
              !assignment ||
              assignment.value !== '=' ||
              assignment.loc.end.line === openBrace.loc.start.line
            ) {
              return
            }

            const previousTokenOrComment = sourceCode.getTokenBefore(openBrace, {
              includeComments: true,
            })
            if (previousTokenOrComment !== assignment) return

            context.report({
              node: openBrace,
              messageId: 'sameLine',
              fix: (fixer) =>
                fixer.replaceTextRange([assignment.range[1], openBrace.range[0]], ' '),
            })
          },
        }
      },
    },
  },
}

export default tseslint.config(
  {
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
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        {
          prefer: 'type-imports',
          fixStyle: 'inline-type-imports',
        },
      ],
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: ['**/*.{js,cjs,mjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
  },
  stylistic.configs['disable-legacy'],
  stylistic.configs.customize({
    indent: 2,
    quotes: 'single',
    semi: false,
    jsx: true,
    arrowParens: true,
    braceStyle: '1tbs',
    commaDangle: 'always-multiline',
    quoteProps: 'as-needed',
  }),
  {
    plugins: {
      local: localPlugin,
    },
    rules: {
      '@stylistic/indent-binary-ops': 'off',
      '@stylistic/jsx-curly-newline': 'off',
      '@stylistic/jsx-one-expression-per-line': 'off',
      '@stylistic/linebreak-style': ['error', 'unix'],
      '@stylistic/member-delimiter-style': 'off',
      '@stylistic/multiline-ternary': 'off',
      '@stylistic/object-curly-newline': [
        'error',
        {
          ObjectExpression: {
            consistent: true,
            multiline: true,
          },
        },
      ],
      '@stylistic/operator-linebreak': [
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
      '@stylistic/quotes': [
        'error',
        'single',
        { allowTemplateLiterals: 'always', avoidEscape: true },
      ],
      'local/object-expression-brace-same-line': 'error',
    },
  },
)
