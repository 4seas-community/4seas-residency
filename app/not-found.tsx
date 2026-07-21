import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/shared/header'
import { Footer } from '@/components/shared/footer'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-24 text-center">
        <h1 className="text-5xl font-semibold text-foreground mb-4">404</h1>
        <p className="text-muted-foreground mb-8">This page doesn&apos;t exist.</p>
        <Button asChild>
          <Link href="/">Back to home</Link>
        </Button>
      </div>
      <Footer />
    </div>
  )
}
