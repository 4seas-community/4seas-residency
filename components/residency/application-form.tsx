'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { submitApplication } from '@/lib/actions/public'
import { COMMUNITY_LINKS } from '@/lib/content/site'
import type { TrackConfig } from '@/lib/content/tracks'
import type { StartDateOption } from '@/lib/content/start-dates'

interface ApplicationFormProps {
  track: Pick<TrackConfig, 'id' | 'name' | 'accentColor' | 'apply'>
  startDateOptions: StartDateOption[]
}

interface FormData {
  fullName: string
  email: string
  telegramOrWhatsapp: string
  country: string
  preferredStartDate: string
  about: string
  contribution: string
  primaryLink: string
  linkedin: string
  extraLink: string
  contentStudioPlans: string
  website: string // honeypot
}

const initialFormData: FormData = {
  fullName: '',
  email: '',
  telegramOrWhatsapp: '',
  country: '',
  preferredStartDate: '',
  about: '',
  contribution: '',
  primaryLink: '',
  linkedin: '',
  extraLink: '',
  contentStudioPlans: '',
  website: '',
}

const countWords = (text: string) => text.trim().split(/\s+/).filter(Boolean).length

export default function ApplicationForm({ track, startDateOptions }: ApplicationFormProps) {
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setError(null)
  }

  const wordCount = countWords(formData.about)
  const isOverLimit = wordCount > 300

  const validateForm = () => {
    if (!formData.fullName.trim()) return setError('Please enter your name'), false
    if (!formData.email.trim() || !formData.email.includes('@'))
      return setError('Please enter a valid email address'), false
    if (!formData.telegramOrWhatsapp.trim()) return setError('Please provide WhatsApp or Telegram contact'), false
    if (!formData.country.trim()) return setError('Please enter your country'), false
    if (!formData.preferredStartDate) return setError('Please select a start date'), false
    if (!formData.about.trim()) return setError('Please tell us about yourself'), false
    if (isOverLimit) return setError('Please keep your response under 300 words'), false
    if (!formData.contribution.trim()) return setError('Please tell us what you plan to contribute'), false
    if (!formData.primaryLink.trim()) return setError('Please provide at least one link'), false
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsSubmitting(true)
    setError(null)
    try {
      const result = await submitApplication({ track: track.id, ...formData })
      if (result.ok) {
        setIsSubmitted(true)
      } else {
        setError(result.message ?? 'Failed to submit application. Please try again.')
      }
    } catch {
      setError('Failed to submit application. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-16">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
          <Check className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-3xl font-bold text-foreground mb-4">Application Submitted!</h2>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          Thank you for applying to {track.name}. We will review your application and notify you of the result within
          one week via the contact information you provided.
        </p>

        <div className="bg-muted/50 rounded-lg p-6 max-w-md mx-auto mb-8">
          <p className="text-sm text-foreground font-medium mb-4">Join our community while you wait:</p>
          <div className="flex flex-col gap-3 justify-center">
            <a
              href={COMMUNITY_LINKS.x}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-black/80 transition-colors text-sm"
            >
              Follow on X
            </a>
            <a
              href={COMMUNITY_LINKS.telegram}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#0088cc] text-white rounded-lg hover:bg-[#0077b5] transition-colors text-sm"
            >
              Join Telegram Group
            </a>
            <a
              href={COMMUNITY_LINKS.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
            >
              Join WhatsApp Group
            </a>
          </div>
        </div>

        <Button asChild>
          <Link href={`/residency/${track.id}`}>Back to {track.name}</Link>
        </Button>
      </motion.div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-8">
      {/* Process and duration — longevity only */}
      {track.apply.showProcessSection && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-6 py-4 border-b border-border" style={{ backgroundColor: `${track.accentColor}15` }}>
            <h2 className="text-base font-semibold text-foreground">Process &amp; Duration</h2>
          </div>
          <div className="px-6 py-5 space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Application Process
              </h3>
              <ol className="space-y-2">
                {[
                  'Submit the application form (including personal background, portfolio/projects, and planned output during the residency)',
                  'Online interview',
                  'Selection notification',
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span
                      className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold mt-0.5"
                      style={{ backgroundColor: track.accentColor }}
                    >
                      {i + 1}
                    </span>
                    <span className="text-sm text-foreground leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Residency Duration
              </h3>
              <p className="text-sm text-foreground">At least one month</p>
            </div>
          </div>
        </div>
      )}

      {/* Honeypot — hidden from humans, tempting for bots */}
      <div className="absolute -left-[9999px] top-auto" aria-hidden="true">
        <label>
          Website
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={formData.website}
            onChange={(e) => handleInputChange('website', e.target.value)}
          />
        </label>
      </div>

      {/* Personal Information */}
      <div className="space-y-6">
        <h2 className="text-sm font-semibold text-muted-foreground tracking-wider">PERSONAL INFORMATION</h2>

        <div className="space-y-2">
          <Label>
            Name <span className="text-red-500">*</span>
          </Label>
          <Input value={formData.fullName} onChange={(e) => handleInputChange('fullName', e.target.value)} placeholder="Your name" />
        </div>

        <div className="space-y-2">
          <Label>
            Email <span className="text-red-500">*</span>
          </Label>
          <Input
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            placeholder="your@email.com"
          />
        </div>

        <div className="space-y-2">
          <Label>
            WhatsApp or Telegram <span className="text-red-500">*</span>
          </Label>
          <Input
            value={formData.telegramOrWhatsapp}
            onChange={(e) => handleInputChange('telegramOrWhatsapp', e.target.value)}
            placeholder="@username or +1234567890"
          />
        </div>
      </div>

      {/* Visit Details */}
      <div className="space-y-6">
        <h2 className="text-sm font-semibold text-muted-foreground tracking-wider">VISIT DETAILS</h2>

        <div className="space-y-2">
          <Label>
            Preferred Start Date <span className="text-red-500">*</span>
          </Label>
          <select
            value={formData.preferredStartDate}
            onChange={(e) => handleInputChange('preferredStartDate', e.target.value)}
            className="w-full h-10 px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground"
          >
            <option value="">Select a start date</option>
            {startDateOptions.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label>
            Country <span className="text-red-500">*</span>
          </Label>
          <Input value={formData.country} onChange={(e) => handleInputChange('country', e.target.value)} placeholder="Your country" />
        </div>
      </div>

      {/* About You */}
      <div className="space-y-6">
        <h2 className="text-sm font-semibold text-muted-foreground tracking-wider">ABOUT YOU</h2>

        <div className="space-y-2">
          <Label>
            Tell us about yourself <span className="text-red-500">*</span>
          </Label>
          <p className="text-sm text-muted-foreground">
            Tell us a bit about yourself and why you&apos;re interested in the program. What are you currently
            exploring, building, researching, or thinking about? And during your stay, how do you imagine contributing
            to the community — through conversations, public sessions, creative work, research, or other forms of
            exchange?
          </p>
          <p className="text-sm text-muted-foreground">
            We value curiosity, openness, and a willingness to participate in community life.
          </p>
          <p className="text-sm text-muted-foreground italic">(Please keep your response under 300 words.)</p>
          <Textarea
            value={formData.about}
            onChange={(e) => handleInputChange('about', e.target.value)}
            placeholder="Tell us about yourself..."
            rows={6}
            className={isOverLimit ? 'border-red-500 focus-visible:ring-red-500' : ''}
          />
          <p className={`text-xs ${isOverLimit ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
            {wordCount}/300 words {isOverLimit && '- Please reduce your response'}
          </p>
        </div>

        <div className="space-y-2">
          <Label>
            What do you plan to contribute? <span className="text-red-500">*</span>
          </Label>
          <p className="text-sm text-muted-foreground">
            Tell us how you imagine contributing to the community during your stay. If you don&apos;t have anything
            specific in mind yet, please describe the part you think you could contribute.
          </p>
          <Textarea
            value={formData.contribution}
            onChange={(e) => handleInputChange('contribution', e.target.value)}
            placeholder="Share your planned contribution, or the part you think you could contribute..."
            rows={5}
          />
        </div>
      </div>

      {/* Social Links */}
      <div className="space-y-6">
        <h2 className="text-sm font-semibold text-muted-foreground tracking-wider">SOCIAL LINKS</h2>

        <div className="space-y-2">
          <Label>
            {track.apply.primaryLinkLabel} <span className="text-red-500">*</span>
          </Label>
          <p className="text-sm text-muted-foreground">At least provide one link, so that we can know a bit more from you.</p>
          <Input
            value={formData.primaryLink}
            onChange={(e) => handleInputChange('primaryLink', e.target.value)}
            placeholder="https://..."
          />
        </div>

        <div className="space-y-2">
          <Label>LinkedIn</Label>
          <Input
            value={formData.linkedin}
            onChange={(e) => handleInputChange('linkedin', e.target.value)}
            placeholder="https://linkedin.com/in/..."
          />
        </div>

        <div className="space-y-2">
          <Label>{track.apply.extraLinkLabel}</Label>
          {track.apply.extraLinkHint && <p className="text-sm text-muted-foreground">{track.apply.extraLinkHint}</p>}
          <Input
            value={formData.extraLink}
            onChange={(e) => handleInputChange('extraLink', e.target.value)}
            placeholder={track.apply.extraLinkPlaceholder}
          />
        </div>
      </div>

      {/* Content Studio */}
      <div className="space-y-6">
        <h2 className="text-sm font-semibold text-muted-foreground tracking-wider">CONTENT STUDIO</h2>

        <div className="space-y-2">
          <Label>Do you have any plans to use the Content Studio during your residency?</Label>
          <p className="text-sm text-muted-foreground">
            We have a fully equipped content studio available for residents. Let us know if you have any content
            creation plans (podcasts, videos, interviews, etc.)
          </p>
          <Textarea
            value={formData.contentStudioPlans}
            onChange={(e) => handleInputChange('contentStudioPlans', e.target.value)}
            placeholder="Your content creation plans (optional)"
            rows={3}
          />
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      <div className="pt-4">
        <Button type="submit" disabled={isSubmitting} className="w-full text-white" style={{ backgroundColor: track.accentColor }}>
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            'Submit Application'
          )}
        </Button>
      </div>
    </form>
  )
}
