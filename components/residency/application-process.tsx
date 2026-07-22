import { APPLICATION_PROCESS } from '@/lib/content/site'

export function ApplicationProcess() {
  return (
    <section aria-labelledby="application-process-title" className="mx-auto mb-10 max-w-2xl">
      <h2
        id="application-process-title"
        className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground"
      >
        What happens next
      </h2>
      <ol className="grid gap-3 md:grid-cols-3">
        {APPLICATION_PROCESS.map((item) => (
          <li key={item.step} className="rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-xs font-semibold text-primary">{item.step}</span>
              <h3 className="font-semibold text-foreground">{item.title}</h3>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">{item.description}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}
