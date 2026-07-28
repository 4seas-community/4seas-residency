import { redirect } from 'next/navigation'

// Legacy link kept alive: /residency/apply → crypto apply page.
// redirect() prepends basePath itself, so the target is written without it.
export default function ApplyRedirect() {
  redirect('/crypto/apply')
}
