export const ISSUE_TYPES = ['bug', 'enhancement', 'question'] as const

export type IssueType = (typeof ISSUE_TYPES)[number]

export const ISSUE_TYPE_LABELS: Record<IssueType, string> = {
  bug: 'Error',
  enhancement: 'Mejora',
  question: 'Pregunta'
}

export const issueTypeLabel = (type: IssueType): string => ISSUE_TYPE_LABELS[type]
