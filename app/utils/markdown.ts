import MarkdownIt from 'markdown-it'

// Instancia única: recrearla en cada render es caro y no aporta nada.
// html: false escapa cualquier etiqueta HTML cruda, por lo que el contenido
// del post no puede inyectar scripts ni atributos peligrosos.
const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
  typographer: false
})

markdown.renderer.rules.link_open = (tokens, idx, options, _env, self) => {
  const token = tokens[idx]
  const href = token?.attrGet('href')
  const isExternal = typeof href === 'string' && /^(https?:)?\/\//i.test(href)

  if (token && isExternal) {
    token.attrSet('target', '_blank')
    token.attrSet('rel', 'noopener noreferrer nofollow')
  }

  return self.renderToken(tokens, idx, options)
}

const imageRule = markdown.renderer.rules.image

markdown.renderer.rules.image = (tokens, idx, options, env, self) => {
  const token = tokens[idx]

  if (token) {
    token.attrSet('loading', 'lazy')
    token.attrSet('decoding', 'async')
  }

  return imageRule
    ? imageRule(tokens, idx, options, env, self)
    : self.renderToken(tokens, idx, options)
}

export function renderMarkdown(content: string): string {
  if (!content) return ''
  return markdown.render(content)
}
