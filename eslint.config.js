// @ts-check
/// <reference types="typescript" options="{\"esModuleInterop\":true}" />

// @ts-ignore
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
// @ts-ignore
import react from "eslint-plugin-react"
// @ts-ignore
import reactCompiler from 'eslint-plugin-react-compiler';
// @ts-ignore
import reactHooks from "eslint-plugin-react-hooks";
import { fixupPluginRules } from "@eslint/compat";
// @ts-ignore
import reactPerf from 'eslint-plugin-react-perf';
// @ts-ignore
import sonarjs from 'eslint-plugin-sonarjs';
// @ts-ignore
import importPlugin from 'eslint-plugin-import';
// @ts-ignore
import unusedImports from 'eslint-plugin-unused-imports';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const tsconfigRootDir = dirname(fileURLToPath(import.meta.url));

const FIX_IMPORTS = process.env.FIX_IMPORTS === 'true';

const baseConfig = tseslint.config(
    {
        ignores: [
            'node_modules/**/*',
            'dist/**/*',
            'build/**/*',
            'src/lib/commands.ts',
            '**/*.js',
            '**/*.cjs',
            'vite.config.ts',
            'vite.config.js',
            'env.dev.ts',
            'env.main.ts',
            'env.dev-test.ts',
            'env.test.ts',
        ],
    },
    {
        languageOptions: {
            parser: tseslint.parser,
            parserOptions: {
                project: './tsconfig.json',
                tsconfigRootDir,
                ecmaVersion: 'latest',
                sourceType: 'module',
            },
        }
    },
    eslint.configs.recommended,
    tseslint.configs.recommended,
    { ...react.configs.flat.recommended, settings: { react: { version: "detect" } } },
    reactCompiler.configs.recommended,
    {
        plugins: {
            "react-hooks": fixupPluginRules(reactHooks),
            "react-perf": reactPerf,
            "sonarjs": sonarjs,
            "import": importPlugin,
            "unused-imports": unusedImports
        },
        rules: {
            "unused-imports/no-unused-imports": FIX_IMPORTS ? "error" : "off",

            // React performance rules
            "react-perf/jsx-no-new-object-as-prop": "off", // Temporary, enable when fixed
            "react-perf/jsx-no-new-array-as-prop": "off", // Temporary, enable when fixed
            "react-perf/jsx-no-new-function-as-prop": "error",
            // "react-perf/jsx-no-jsx-as-prop": "error", // disabled because too many false positives

            // SonarJS optimization rules
            // "sonarjs/no-identical-functions": "error", // Disabled because code style issue, not performance

            // Import optimization
            "import/no-duplicates": "error",

            // TypeScript optimization: Disabled because not all that related to performance
            // "@typescript-eslint/no-unnecessary-condition": "error",
            "@typescript-eslint/no-unused-vars": "off",

            // React hooks
            "react/jsx-no-bind": ["error", {
                "allowArrowFunctions": false,
                "allowFunctions": false,
                "allowBind": false
            }],
            "react-hooks/exhaustive-deps": "error",
            'react-compiler/react-compiler': 'error',
            // styling rules
            'indent': 'off',
            'linebreak-style': 'off',
            'quotes': 'off',
            'semi': 'off',
            'space-before-function-paren': 'off',
            'keyword-spacing': 'off',
            'comma-spacing': 'off',
            'space-infix-ops': 'off',
            'eol-last': 'off',
            'no-multiple-empty-lines': 'off',
            'padded-blocks': 'off',
            'key-spacing': 'off',
            'space-in-parens': 'off',
            'array-bracket-spacing': 'off',
            'object-curly-spacing': 'off',
            'block-spacing': 'off',
            'computed-property-spacing': 'off',
            'func-call-spacing': 'off',
            'no-trailing-spaces': 'off',
            'no-whitespace-before-property': 'off',
            'space-before-blocks': 'off',
            'space-unary-ops': 'off',
            'spaced-comment': 'off',
            'template-curly-spacing': 'off',
            'arrow-spacing': 'off',
            'no-irregular-whitespace': 'off',
            'no-mixed-spaces-and-tabs': 'off',
            'no-tabs': 'off',
            'brace-style': 'off',
            'comma-dangle': 'off',
            'comma-style': 'off',
            'consistent-this': 'off',
            'func-names': 'off',
            'func-style': 'off',
            'id-length': 'off',
            'id-match': 'off',
            'lines-around-comment': 'off',
            'multiline-ternary': 'off',
            'new-cap': 'off',
            'new-parens': 'off',
            'newline-per-chained-call': 'off',
            'no-array-constructor': 'off',
            'no-continue': 'off',
            'no-inline-comments': 'off',
            'no-lonely-if': 'off',
            'no-mixed-operators': 'off',
            'no-multi-assign': 'off',
            'no-negated-condition': 'off',
            'no-nested-ternary': 'off',
            'no-new-object': 'off',
            'no-plusplus': 'off',
            'no-restricted-syntax': 'off',
            'no-ternary': 'off',
            'no-underscore-dangle': 'off',
            'one-var': 'off',
            'operator-assignment': 'off',
            'operator-linebreak': 'off',
            'quote-props': 'off',
            'require-jsdoc': 'off',
            'sort-keys': 'off',
            'sort-vars': 'off',
            'wrap-regex': 'off',
            // end styling rules
            // complexity rules
            'complexity': 'off',
            'max-depth': 'off',
            'max-len': 'off',
            'max-lines': 'off',
            'max-nested-callbacks': 'off',
            'max-params': 'off',
            'max-statements': 'off',
            'max-statements-per-line': 'off',
            // best practices
            'no-alert': 'off',
            'no-caller': 'off',
            'no-eval': 'off',
            'no-extend-native': 'off',
            'no-implied-eval': 'off',
            'no-iterator': 'off',
            'no-new-func': 'off',
            'no-proto': 'off',
            'no-script-url': 'off',
            'no-with': 'off',
            // react specific rules
            'react/display-name': 'off',
            'react/no-children-prop': 'off',
            'react/no-danger': 'off',
            'react/no-deprecated': 'off',
            'react/no-did-mount-set-state': 'off',
            'react/no-did-update-set-state': 'off',
            'react/no-direct-mutation-state': 'off',
            'react/no-find-dom-node': 'off',
            'react/no-is-mounted': 'off',
            'react/no-multi-comp': 'off',
            'react/no-redundant-should-component-update': 'off',
            'react/no-render-return-value': 'off',
            'react/no-string-refs': 'off',
            'react/no-unescaped-entities': 'off',
            'react/no-unknown-property': 'off',
            'react/no-unsafe': 'off',
            'react/no-unused-prop-types': 'off',
            'react/no-unused-state': 'off',
            'react/no-will-update-set-state': 'off',
            'react/prefer-es6-class': 'off',
            'react/prefer-stateless-function': 'off',
            'react/prop-types': 'off',
            'react/react-in-jsx-scope': 'off',
            'react/require-default-props': 'off',
            'react/require-optimization': 'off',
            'react/require-render-return': 'off',
            'react/self-closing-comp': 'off',
            'react/sort-comp': 'off',
            'react/sort-prop-types': 'off',
            'react/state-in-constructor': 'off',
            'react/static-property-placement': 'off',
            'react/style-prop-object': 'off',
            'react/void-dom-elements-no-children': 'off',
            // end react rules
            "no-console": "off",
            "import/named": "off",
            "import/namespace": "off",
            "import/default": "off",
            "import/no-named-as-default-member": "off",
            "import/no-named-as-default": "off",
            "import/no-cycle": "off",
            "import/no-deprecated": "off",
            // 'react-refresh/only-export-components': [
            //     'warn',
            //     { allowConstantExport: true },
            // ],
            '@typescript-eslint/explicit-module-boundary-types': 'off',
        }
    }
);

// Convert all warning rules to off
const prodConfig = baseConfig.map(config => {
    if (config.rules) {
        const rules = { ...config.rules };
        Object.keys(rules).forEach(key => {
            if (rules[key] === 'warn' || (Array.isArray(rules[key]) && rules[key][0] === 'warn')) {
                rules[key] = 'off';
            }
        });
        return { ...config, rules };
    }
    return config;
});

export default prodConfig;