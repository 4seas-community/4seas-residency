import { redirect } from 'next/navigation'

// Legacy link kept alive: /apply → crypto apply page.
export default function ApplyRedirect() {
  redirect('/crypto/apply')
}
