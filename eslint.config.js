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
          closeCall: 'Place the call closing parenthesis on the same line as the object.',
          sameLine: 'Place the object opening brace on the same line as its leading token.',
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
            const isSoleCallArgument =
              (parent.type === 'CallExpression' || parent.type === 'NewExpression') &&
              parent.arguments.length === 1 &&
              parent.arguments[0] === node

            if (!isAssignedObject && !isSoleCallArgument) return

            const openBrace = sourceCode.getFirstToken(node)
            const leadingToken = openBrace && sourceCode.getTokenBefore(openBrace)
            const expectedLeadingToken = isAssignedObject ? '=' : '('

            if (!openBrace || !leadingToken || leadingToken.value !== expectedLeadingToken) {
              return
            }

            const previousTokenOrComment = sourceCode.getTokenBefore(openBrace, {
              includeComments: true,
            })
            if (
              previousTokenOrComment === leadingToken &&
              leadingToken.loc.end.line !== openBrace.loc.start.line
            ) {
              context.report({
                node: openBrace,
                messageId: 'sameLine',
                fix: (fixer) =>
                  fixer.replaceTextRange(
                    [leadingToken.range[1], openBrace.range[0]],
                    isAssignedObject ? ' ' : '',
                  ),
              })
            }

            if (!isSoleCallArgument) return

            const closeBrace = sourceCode.getLastToken(node)
            const closingParenthesis = sourceCode.getLastToken(parent)
            if (!closeBrace || !closingParenthesis || closingParenthesis.value !== ')') return

            const tokensBetween = sourceCode.getTokensBetween(closeBrace, closingParenthesis, {
              includeComments: true,
            })
            if (tokensBetween.some((token) => token.value !== ',')) return
            if (
              tokensBetween.length === 0 &&
              closeBrace.loc.end.line === closingParenthesis.loc.start.line
            ) {
              return
            }

            context.report({
              node: closeBrace,
              messageId: 'closeCall',
              fix: (fixer) =>
                fixer.replaceTextRange([closeBrace.range[1], closingParenthesis.range[0]], ''),
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
