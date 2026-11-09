import { describe, expect, it } from 'vitest'
import { buildCommentTree, countComments } from '../useBlogInteractions'
import type { BlogCommentRow } from '../useBlogInteractions'
import type { BlogCommentAuthorRef } from '~/types/blog'

const author = (id: string, overrides: Partial<BlogCommentAuthorRef> = {}): BlogCommentAuthorRef => ({
  id,
  user_name: `user-${id}`,
  full_name: null,
  avatar_url: null,
  ...overrides
})

const row = (overrides: Partial<BlogCommentRow> & Pick<BlogCommentRow, 'id'>): BlogCommentRow => ({
  post_id: 'post-1',
  user_id: 'user-1',
  parent_id: null,
  content: 'comentario',
  depth: 0,
  created_at: '2026-11-07T10:00:00.000Z',
  updated_at: '2026-11-07T10:00:00.000Z',
  ...overrides
})

describe('buildCommentTree', () => {
  it('agrupa respuestas bajo su comentario padre', () => {
    const tree = buildCommentTree(
      [
        row({ id: 'root' }),
        row({ id: 'reply-1', parent_id: 'root', created_at: '2026-11-07T10:01:00.000Z' }),
        row({ id: 'reply-2', parent_id: 'reply-1', depth: 2, created_at: '2026-11-07T10:02:00.000Z' })
      ],
      new Map()
    )

    expect(tree).toHaveLength(1)
    expect(tree[0]?.id).toBe('root')
    expect(tree[0]?.replies).toHaveLength(1)
    expect(tree[0]?.replies[0]?.id).toBe('reply-1')
    expect(tree[0]?.replies[0]?.replies[0]?.id).toBe('reply-2')
  })

  it('ordena raíces y respuestas por fecha ascendente', () => {
    const tree = buildCommentTree(
      [
        row({ id: 'b', created_at: '2026-11-07T11:00:00.000Z' }),
        row({ id: 'a', created_at: '2026-11-07T10:00:00.000Z' }),
        row({ id: 'a-2', parent_id: 'a', created_at: '2026-11-07T10:02:00.000Z' }),
        row({ id: 'a-1', parent_id: 'a', created_at: '2026-11-07T10:01:00.000Z' })
      ],
      new Map()
    )

    expect(tree.map(node => node.id)).toEqual(['a', 'b'])
    expect(tree[0]?.replies.map(node => node.id)).toEqual(['a-1', 'a-2'])
  })

  it('adjunta la identidad del autor cuando está disponible', () => {
    const authors = new Map<string, BlogCommentAuthorRef>([
      ['user-1', author('user-1', { avatar_url: 'https://example.com/a.png' })]
    ])

    const tree = buildCommentTree([row({ id: 'root' })], authors)

    expect(tree[0]?.author).toEqual(author('user-1', { avatar_url: 'https://example.com/a.png' }))
  })

  it('deja author en null si la RPC no devolvió al usuario', () => {
    const tree = buildCommentTree([row({ id: 'root', user_id: 'desconocido' })], new Map())

    expect(tree[0]?.author).toBeNull()
  })

  it('deja author en null en comentarios de usuarios eliminados', () => {
    const tree = buildCommentTree([row({ id: 'root', user_id: null })], new Map())

    expect(tree[0]?.author).toBeNull()
    expect(tree[0]?.user_id).toBeNull()
  })

  it('trata un padre inexistente como comentario raíz para no perderlo', () => {
    const tree = buildCommentTree([row({ id: 'orphan', parent_id: 'no-existe' })], new Map())

    expect(tree).toHaveLength(1)
    expect(tree[0]?.id).toBe('orphan')
  })
})

describe('countComments', () => {
  it('cuenta raíces y respuestas anidadas', () => {
    const tree = buildCommentTree(
      [
        row({ id: 'root-1' }),
        row({ id: 'reply-1', parent_id: 'root-1' }),
        row({ id: 'reply-1-1', parent_id: 'reply-1', depth: 2 }),
        row({ id: 'root-2', created_at: '2026-11-07T12:00:00.000Z' })
      ],
      new Map()
    )

    expect(countComments(tree)).toBe(4)
  })

  it('devuelve 0 sin comentarios', () => {
    expect(countComments([])).toBe(0)
  })
})
