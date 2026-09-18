import { Octokit } from '@octokit/core'
import { z } from 'zod'
import { serverSupabaseUser } from '#supabase/server'

const config = useRuntimeConfig()

const bodySchema = z.object({
  title: z.string().min(1).max(100),
  body: z.string().min(1).max(500),
  issueType: z.enum(ISSUE_TYPES),
  contact: z.string().trim().max(80).optional()
})

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Debes iniciar sesión para reportar un problema.'
    })
  }

  useRateLimit(event, {
    max: 5,
    windowMs: 60_000,
    message: 'Demasiados reportes. Intenta de nuevo en un momento.'
  })

  const body = await readBody(event).catch(() => null)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Datos del reporte inválidos' })
  }

  const { title, body: issueBody, issueType, contact } = parsed.data

  const markdownBody = [
    contact ? `**Contacto:** ${contact}` : null,
    `**Tipo:** ${issueTypeLabel(issueType)}`,
    '',
    issueBody
  ].filter(Boolean).join('\n')

  const octokit = new Octokit({ auth: config.githubIssuesToken })
  const owner = config.githubOwner
  const repo = config.githubRepo
  const uri = `POST /repos/${owner}/${repo}/issues`

  try {
    const { data } = await octokit.request(uri, {
      owner: owner,
      repo: repo,
      title,
      body: markdownBody,
      labels: [issueType],
      type: issueType,
      headers: {
        'X-GitHub-Api-Version': '2026-03-10'
      }
    })
    return { ok: true, url: data.html_url }
  } catch {
    throw createError({ statusCode: 502, statusMessage: 'Bad Gateway', message: 'No se pudo crear el reporte' })
  }
})
