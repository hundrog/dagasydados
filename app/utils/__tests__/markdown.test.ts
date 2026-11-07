import { describe, expect, it } from 'vitest'
import { markdownToPlainText, renderMarkdown } from '../markdown'

describe('renderMarkdown', () => {
  it('renderiza títulos de h1 a h6', () => {
    const html = renderMarkdown('# Uno\n\n## Dos\n\n### Tres\n\n#### Cuatro')

    expect(html).toContain('<h1>Uno</h1>')
    expect(html).toContain('<h2>Dos</h2>')
    expect(html).toContain('<h3>Tres</h3>')
    expect(html).toContain('<h4>Cuatro</h4>')
  })

  it('renderiza énfasis, tachado y código inline', () => {
    const html = renderMarkdown('**negrita** *cursiva* ~~tachado~~ `código`')

    expect(html).toContain('<strong>negrita</strong>')
    expect(html).toContain('<em>cursiva</em>')
    expect(html).toContain('<s>tachado</s>')
    expect(html).toContain('<code>código</code>')
  })

  it('renderiza listas ordenadas y no ordenadas', () => {
    const unordered = renderMarkdown('* uno\n* dos')
    const ordered = renderMarkdown('1. uno\n2. dos')

    expect(unordered).toContain('<ul>')
    expect(unordered.match(/<li>/g)).toHaveLength(2)
    expect(ordered).toContain('<ol>')
    expect(ordered.match(/<li>/g)).toHaveLength(2)
  })

  it('renderiza listas anidadas', () => {
    const html = renderMarkdown('* uno\n  * anidado')

    expect(html.match(/<ul>/g)).toHaveLength(2)
    expect(html).toContain('anidado')
  })

  it('renderiza citas y separadores', () => {
    const quote = renderMarkdown('> Texto citado')
    const hr = renderMarkdown('---')

    expect(quote).toContain('<blockquote>')
    expect(quote).toContain('Texto citado')
    expect(hr).toContain('<hr>')
  })

  it('renderiza bloques de código sin resaltado', () => {
    const html = renderMarkdown('```\nconst dado = 20\n```')

    expect(html).toContain('<pre><code>const dado = 20')
    expect(html).not.toContain('class="hljs')
  })

  it('renderiza tablas', () => {
    const html = renderMarkdown('| Nombre | Nivel |\n| ------ | ----- |\n| Aria   | 5     |')

    expect(html).toContain('<table>')
    expect(html).toContain('<th>Nombre</th>')
    expect(html).toContain('<th>Nivel</th>')
    expect(html).toContain('<td>Aria</td>')
    expect(html).toContain('<td>5</td>')
  })

  it('respeta los saltos de línea simples', () => {
    const html = renderMarkdown('línea uno\nlínea dos')

    expect(html).toContain('<br>')
  })

  it('convierte URLs sueltas en enlaces', () => {
    const html = renderMarkdown('Visita https://example.com')

    expect(html).toContain('href="https://example.com"')
  })

  it('devuelve una cadena vacía si no hay contenido', () => {
    expect(renderMarkdown('')).toBe('')
  })

  describe('enlaces e imágenes', () => {
    it('abre enlaces externos en otra pestaña con rel seguro', () => {
      const html = renderMarkdown('[ejemplo](https://example.com)')

      expect(html).toContain('target="_blank"')
      expect(html).toContain('rel="noopener noreferrer nofollow"')
    })

    it('no añade target a enlaces internos', () => {
      const html = renderMarkdown('[blog](/blog)')

      expect(html).not.toContain('target="_blank"')
    })

    it('marca las imágenes como lazy', () => {
      const html = renderMarkdown('![alt](https://example.com/imagen.png)')

      expect(html).toContain('loading="lazy"')
      expect(html).toContain('decoding="async"')
    })
  })

  describe('seguridad', () => {
    it('escapa etiquetas script', () => {
      const html = renderMarkdown('<script>alert(1)</script>')

      expect(html).not.toContain('<script>')
      expect(html).toContain('&lt;script&gt;')
    })

    it('escapa etiquetas con atributos peligrosos', () => {
      const html = renderMarkdown('<img src=x onerror=alert(1)>')

      expect(html).not.toContain('<img')
      expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;')
    })

    it('bloquea enlaces con javascript:', () => {
      const html = renderMarkdown('[click](javascript:alert(1))')

      expect(html).not.toContain('href="javascript:')
      expect(html).not.toContain('href=\'javascript:')
    })

    it('bloquea enlaces con vbscript: y file:', () => {
      const vbscript = renderMarkdown('[click](vbscript:msgbox(1))')
      const file = renderMarkdown('[click](file:///etc/passwd)')

      expect(vbscript).not.toContain('href="vbscript:')
      expect(file).not.toContain('href="file:')
    })

    it('bloquea imágenes con data:text/html', () => {
      const html = renderMarkdown('![x](data:text/html;base64,PHNjcmlwdD4=)')

      expect(html).not.toContain('src="data:text/html')
    })

    it('bloquea HTML embebido mezclado con Markdown', () => {
      const html = renderMarkdown('**texto** <iframe src="https://evil.test"></iframe>')

      expect(html).toContain('<strong>texto</strong>')
      expect(html).not.toContain('<iframe')
      expect(html).toContain('&lt;iframe')
    })
  })

  describe('markdownToPlainText', () => {
    it('quita encabezados, énfasis y enlaces', () => {
      const text = markdownToPlainText('## Título\n\n**Texto** con [un enlace](/blog).')

      expect(text).toBe('Título Texto con un enlace.')
    })

    it('convierte bloques y saltos en espacios', () => {
      const text = markdownToPlainText('Línea uno\n\nLínea dos\n\n* item uno\n* item dos')

      expect(text).toBe('Línea uno Línea dos item uno item dos')
    })

    it('no deja etiquetas ni entidades HTML', () => {
      const text = markdownToPlainText('<script>alert(1)</script> & texto')

      expect(text).not.toContain('<')
      expect(text).not.toContain('>')
      expect(text).toContain('& texto')
    })

    it('devuelve cadena vacía sin contenido', () => {
      expect(markdownToPlainText('')).toBe('')
    })
  })
})
