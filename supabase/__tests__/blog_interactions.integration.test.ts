import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_TEST_URL
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_TEST_PUBLISHABLE_KEY
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_TEST_SERVICE_KEY

const hasTestConfig = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY && SUPABASE_SERVICE_KEY)

const available = await (async () => {
  if (!hasTestConfig || !SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) return false
  try {
    const client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
    const { data } = await client.from('blog_comments').select('id').limit(1)
    return data !== null
  } catch {
    return false
  }
})()

describe.skipIf(!available)('interacciones del blog (integración)', () => {
  const stamp = Date.now()
  const service = createClient(SUPABASE_URL as string, SUPABASE_SERVICE_KEY as string, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  let userA: { id: string, email: string }
  let userB: { id: string, email: string }
  let clientA: SupabaseClient
  let clientB: SupabaseClient
  let anon: SupabaseClient
  let post1: { id: string }
  let post2: { id: string }
  let rootCommentId = ''
  let nestedCommentId = ''
  const threadIds: string[] = []

  async function createUser(label: string) {
    const email = `blog-it-${label}-${stamp}-${crypto.randomUUID().slice(0, 8)}@example.com`
    const { data, error } = await service.auth.admin.createUser({
      email,
      password: 'password123',
      email_confirm: true,
      user_metadata: { full_name: `Usuario ${label}`, name: `blog-${label}` }
    })

    if (error) throw error
    return { id: data.user.id, email }
  }

  async function signIn(user: { email: string }) {
    const client = createClient(SUPABASE_URL as string, SUPABASE_PUBLISHABLE_KEY as string, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
    const { error } = await client.auth.signInWithPassword({
      email: user.email,
      password: 'password123'
    })
    if (error) throw error
    return client
  }

  beforeAll(async () => {
    anon = createClient(SUPABASE_URL as string, SUPABASE_PUBLISHABLE_KEY as string, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    userA = await createUser('a')
    userB = await createUser('b')
    clientA = await signIn(userA)
    clientB = await signIn(userB)

    const { data, error } = await service
      .from('blog_posts')
      .insert({
        slug: `blog-it-${stamp}`,
        title: 'Post de integración',
        content: 'Contenido',
        author_id: userA.id,
        status: 'published'
      })
      .select('id')
      .single()

    if (error) throw error
    post1 = data

    const { data: secondPost, error: secondError } = await service
      .from('blog_posts')
      .insert({
        slug: `blog-it-${stamp}-2`,
        title: 'Otro post',
        content: 'Contenido',
        author_id: userA.id,
        status: 'published'
      })
      .select('id')
      .single()

    if (secondError) throw secondError
    post2 = secondPost
  })

  afterAll(async () => {
    await service.from('admins').delete().eq('id', userA.id)
    await service.from('blog_posts').delete().in('id', [post1.id, post2.id])
    await service.from('dagger_masters').delete().in('id', [userA.id, userB.id])
    await service.auth.admin.deleteUser(userA.id)
    await service.auth.admin.deleteUser(userB.id)
  })

  it('calcula depth, corta el anidamiento y guarda historial', async () => {
    const { data: root, error } = await clientA
      .from('blog_comments')
      .insert({ post_id: post1.id, user_id: userA.id, content: 'raíz', depth: 99 })
      .select('*')
      .single()

    expect(error).toBeNull()
    expect(root.depth).toBe(0)
    rootCommentId = root.id
    threadIds.push(root.id)

    let parent = root
    for (let depth = 1; depth <= 5; depth++) {
      const { data: reply, error: replyError } = await clientA
        .from('blog_comments')
        .insert({ post_id: post1.id, user_id: userA.id, parent_id: parent.id, content: `nivel ${depth}` })
        .select('*')
        .single()

      expect(replyError).toBeNull()
      expect(reply.depth).toBe(depth)
      if (depth === 1) nestedCommentId = reply.id
      threadIds.push(reply.id)
      parent = reply
    }

    const { error: tooDeepError } = await clientA
      .from('blog_comments')
      .insert({ post_id: post1.id, user_id: userA.id, parent_id: parent.id, content: 'nivel 6' })

    expect(tooDeepError?.message).toMatch(/Profundidad máxima/)

    const { error: editError } = await clientA
      .from('blog_comments')
      .update({ content: 'raíz editada' })
      .eq('id', root.id)

    expect(editError).toBeNull()

    const { data: history, error: historyError } = await clientA
      .from('blog_comment_history')
      .select('old_content, changed_by')
      .eq('comment_id', root.id)

    expect(historyError).toBeNull()
    expect(history).toEqual([{ old_content: 'raíz', changed_by: userA.id }])
  })

  it('protege la integridad de los hilos y la RLS de autoría', async () => {
    const { data: commentB, error: commentBError } = await clientB
      .from('blog_comments')
      .insert({ post_id: post1.id, user_id: userB.id, content: 'de B' })
      .select('*')
      .single()

    expect(commentBError).toBeNull()

    const spoof = await clientA
      .from('blog_comments')
      .insert({ post_id: post1.id, user_id: userB.id, content: 'spoof' })
    expect(spoof.error).not.toBeNull()

    const editOther = await clientB
      .from('blog_comments')
      .update({ content: 'intento' })
      .eq('id', rootCommentId)
      .select('*')
    expect(editOther.data).toHaveLength(0)

    const reparent = await clientA
      .from('blog_comments')
      .update({ parent_id: null })
      .eq('id', nestedCommentId)
    expect(reparent.error).not.toBeNull()

    const crossPost = await clientA
      .from('blog_comments')
      .insert({ post_id: post2.id, user_id: userA.id, parent_id: rootCommentId, content: 'cruzado' })
    expect(crossPost.error).not.toBeNull()

    await clientA.from('blog_comments').delete().eq('id', commentB.id)
    const { data: stillThere } = await service.from('blog_comments').select('id').eq('id', commentB.id)
    expect(stillThere).toHaveLength(1)
  })

  it('respeta la lectura pública y la autoría vía RPC', async () => {
    const read = await anon.from('blog_comments').select('id').eq('post_id', post1.id)
    expect(read.error).toBeNull()
    expect(read.data?.length).toBeGreaterThan(0)

    const write = await anon
      .from('blog_comments')
      .insert({ post_id: post1.id, user_id: userA.id, content: 'anon' })
    expect(write.error).not.toBeNull()

    const history = await anon.from('blog_comment_history').select('id').limit(1)
    expect(history.error).not.toBeNull()

    const authors = await anon.rpc('blog_comment_authors', { p_user_ids: [userA.id] })
    expect(authors.error).toBeNull()
    expect(authors.data?.some(author => author.id === userA.id)).toBe(true)
  })

  it('aplica el unique de likes y sus permisos', async () => {
    const like = await clientA.from('blog_likes').insert({ post_id: post1.id, user_id: userA.id })
    expect(like.error).toBeNull()

    const duplicate = await clientA.from('blog_likes').insert({ post_id: post1.id, user_id: userA.id })
    expect(duplicate.error?.code).toBe('23505')

    const spoof = await clientA.from('blog_likes').insert({ post_id: post1.id, user_id: userB.id })
    expect(spoof.error).not.toBeNull()

    const { data: likeB } = await service
      .from('blog_likes')
      .insert({ post_id: post1.id, user_id: userB.id })
      .select('id')
      .single()

    await clientA.from('blog_likes').delete().eq('id', likeB.id)
    const { data: likeBStill } = await service.from('blog_likes').select('id').eq('id', likeB.id)
    expect(likeBStill).toHaveLength(1)
  })

  it('permite al admin borrar y borra el hilo en cascada', async () => {
    await service.from('admins').insert({ id: userA.id })

    const { data: commentB } = await clientB
      .from('blog_comments')
      .insert({ post_id: post1.id, user_id: userB.id, content: 'borrado por admin' })
      .select('id')
      .single()

    await clientA.from('blog_comments').delete().eq('id', commentB.id)
    const { data: deleted } = await service.from('blog_comments').select('id').eq('id', commentB.id)
    expect(deleted).toHaveLength(0)

    await clientA.from('blog_comments').delete().eq('id', rootCommentId)
    const { data: remaining } = await service
      .from('blog_comments')
      .select('id')
      .in('id', threadIds)
    expect(remaining).toHaveLength(0)
  })
})
