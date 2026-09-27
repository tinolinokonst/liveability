import { createClient } from './supabase'

/** Matches the check constraint on feedback.message in the migration. */
export const MAX_FEEDBACK_LENGTH = 2000

export async function submitFeedback(userId: string, message: string, page: string): Promise<void> {
  const supabase = createClient()
  // No .select() after the insert: the table is insert-only under RLS, so
  // asking for the row back would be denied even though the insert succeeded.
  const { error } = await supabase
    .from('feedback')
    .insert({ user_id: userId, message: message.trim(), page: page.slice(0, 200) })

  if (error) throw error
}
