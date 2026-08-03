// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  {
    files: ['nuxt.config.ts'],
    rules: {
      '@stylistic/quotes': 'off'
    }
  }
)
