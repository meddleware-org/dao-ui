// ESLint configuration: Vue, TypeScript and accessibility rules for the templates, plus the rule that keeps chain logic out of the app. `npm run lint:js` reads it.
// The chain-access boundary rule shared by the apps.
import { suiBoundary } from '@meddleware/eslint-config'
// Files ESLint never reads.
import { globalIgnores } from 'eslint/config'
// The Vue + TypeScript flat-config builder.
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
// Vue's own rules.
import pluginVue from 'eslint-plugin-vue'
// Accessibility rules for Vue templates.
import pluginA11y from 'eslint-plugin-vuejs-accessibility'

// Flat ESLint config for the component library. Layers vue-a11y (WAI-ARIA
// linting for templates) on top of the standard Vue + TypeScript recommended
// rules, so accessibility regressions are caught in CI.
export default defineConfigWithVueTs(
  {
    // Lint Vue and TypeScript files.
    name: 'dao-ui/files-to-lint',
    files: ['**/*.{vue,ts,mts,tsx}'],
  },

  // Never lint build output or declaration files.
  globalIgnores(['**/dist/**', '**/coverage/**', '**/*.d.ts']),

  // Vue's essential rules.
  ...pluginVue.configs['flat/essential'],
  // The accessibility rules, recommended set.
  ...pluginA11y.configs['flat/recommended'],
  // TypeScript's recommended rules for Vue files.
  vueTsConfigs.recommended,

  {
    // Two deliberate changes to the accessibility rules.
    name: 'dao-ui/a11y-overrides',
    rules: {
      // <ol role="list"> is an intentional workaround: Safari/VoiceOver drops
      // list semantics when list-style is removed, so the explicit role stays.
      'vuejs-accessibility/no-redundant-roles': 'off',
      // Accept both valid label-association patterns: a label wrapping its
      // control (nesting) or a label[for] pointing at a control[id]. Both are
      // used by the form primitives (UiSegmentedControl nests; UiFormField uses for/id).
      'vuejs-accessibility/label-has-for': [
        'error',
        { required: { some: ['nesting', 'id'] } },
      ],
    },
  },

  // Last: no on-chain logic in src/ outside src/wallet.ts (see CLAUDE.md); never disabled.
  ...suiBoundary(),
)
