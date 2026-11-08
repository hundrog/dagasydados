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

/**
 * Extrae el texto plano de un Markdown. Se usa para meta descripciones:
 * el HTML renderizado incluiría etiquetas y entidades, que no queremos
 * dentro de `content`/`description`.
 */
export function markdownToPlainText(content: string): string {
  if (!content) return ''

  const collectInline = (tokens: ReturnType<typeof markdown.parse>): string => {
    let text = ''

    for (const token of tokens) {
      if (token.type === 'text' || token.type === 'code_inline') {
        text += token.content
      } else if (token.type === 'softbreak' || token.type === 'hardbreak') {
        text += ' '
      } else if (token.type === 'image') {
        text += token.content
      } else if (token.children) {
        text += collectInline(token.children)
      }
    }

    return text
  }

  const blocks: string[] = []
  for (const token of markdown.parse(content, {})) {
    if (token.type === 'inline' && token.children) {
      blocks.push(collectInline(token.children))
    } else if (token.type === 'fence' || token.type === 'code_block') {
      blocks.push(token.content)
    }
  }

  return blocks
    .join(' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
