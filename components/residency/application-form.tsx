'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { formatSocialLink, SocialPlatformIcon } from '@/components/shared/social-platform-icon'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CountryCombobox } from '@/components/residency/country-combobox'
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
  contactMethod: 'telegram' | 'whatsapp'
  telegramOrWhatsapp: string
  country: string
  preferredStartDate: string
  about: string
  contribution: string
  pastContribution: string
  participationCommitment: string
  primaryLink: string
  linkedin: string
  extraLink: string
  contentStudioPlans: string
  website: string // honeypot
}

const initialFormData: FormData = {
  fullName: '',
  email: '',
  contactMethod: 'telegram',
  telegramOrWhatsapp: '',
  country: '',
  preferredStartDate: '',
  about: '',
  contribution: '',
  pastContribution: '',
  participationCommitment: '',
  primaryLink: '',
  linkedin: '',
  extraLink: '',
  contentStudioPlans: '',
  website: '',
}

const countWords = (text: string) => text.trim().split(/\s+/).filter(Boolean).length

type FieldErrors = Partial<Record<keyof FormData, string>>

// Aligned with the server's zod .email() — the old includes('@') let through
// values the server would then reject.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Validation + focus order, top to bottom as rendered.
const FIELD_ORDER: (keyof FormData)[] = [
  'fullName', 'email', 'telegramOrWhatsapp', 'preferredStartDate', 'country',
  'about', 'contribution', 'pastContribution', 'participationCommitment', 'primaryLink',
]

const fieldId = (field: keyof FormData) => `apply-${field}`

function validate(data: FormData): FieldErrors {
  const errors: FieldErrors = {}
  if (!data.fullName.trim()) errors.fullName = 'Please enter your name'
  if (!EMAIL_RE.test(data.email.trim())) errors.email = 'Please enter a valid email address'
  if (!data.telegramOrWhatsapp.trim()) {
    errors.telegramOrWhatsapp =
      data.contactMethod === 'whatsapp' ? 'Please enter your WhatsApp number' : 'Please enter your Telegram username'
  }
  if (!data.preferredStartDate) errors.preferredStartDate = 'Please select a start date'
  if (!data.country.trim()) errors.country = 'Please select your country or region'
  if (!data.about.trim()) errors.about = 'Please tell us about yourself'
  else if (countWords(data.about) > 300) errors.about = 'Please keep your response under 300 words'
  if (!data.contribution.trim()) errors.contribution = 'Please tell us what you plan to contribute'
  else if (countWords(data.contribution) > 300) errors.contribution = 'Please keep your response under 300 words'
  if (!data.pastContribution.trim()) errors.pastContribution = 'Please tell us about a past contribution'
  else if (countWords(data.pastContribution) > 300) errors.pastContribution = 'Please keep your response under 300 words'
  if (!data.participationCommitment.trim()) errors.participationCommitment = 'Please describe your participation commitment'
  else if (countWords(data.participationCommitment) > 300) errors.participationCommitment = 'Please keep your response under 300 words'
  if (!data.primaryLink.trim()) errors.primaryLink = 'Please provide at least one link'
  return errors
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-sm text-red-500">{message}</p>
}

export default function ApplicationForm({ track, startDateOptions }: ApplicationFormProps) {
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [serverError, setServerError] = useState<string | null>(null)

  const handleInputChange = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev))
    setServerError(null)
  }

  const aboutWordCount = countWords(formData.about)
  const isAboutOverLimit = aboutWordCount > 300
  const contributionWordCount = countWords(formData.contribution)
  const isContributionOverLimit = contributionWordCount > 300
  const pastContributionWordCount = countWords(formData.pastContribution)
  const isPastContributionOverLimit = pastContributionWordCount > 300
  const participationCommitmentWordCount = countWords(formData.participationCommitment)
  const isParticipationCommitmentOverLimit = participationCommitmentWordCount > 300

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate(formData)
    setErrors(errs)
    setServerError(null)
    const firstInvalid = FIELD_ORDER.find((f) => errs[f])
    if (firstInvalid) {
      const el = document.getElementById(fieldId(firstInvalid))
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el?.focus({ preventScroll: true })
      return
    }

    setIsSubmitting(true)
    try {
      const result = await submitApplication({ track: track.id, ...formData })
      if (result.ok) {
        setIsSubmitted(true)
      } else {
        setServerError(result.message ?? 'Failed to submit application. Please try again.')
      }
    } catch {
      setServerError('Failed to submit application. Please try again.')
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
          Thank you for applying to {track.name}. We&apos;ve received your application and will review it within one
          week. If we&apos;d like to learn more, we&apos;ll contact you to arrange a short interview. You&apos;ll receive
          the final decision by email.
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
              <SocialPlatformIcon url={COMMUNITY_LINKS.x} />
              {formatSocialLink(COMMUNITY_LINKS.x)}
            </a>
            <a
              href={COMMUNITY_LINKS.telegram}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#0088cc] text-white rounded-lg hover:bg-[#0077b5] transition-colors text-sm"
            >
              <SocialPlatformIcon url={COMMUNITY_LINKS.telegram} />
              {formatSocialLink(COMMUNITY_LINKS.telegram)}
            </a>
            <a
              href={COMMUNITY_LINKS.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
            >
              <SocialPlatformIcon url={COMMUNITY_LINKS.whatsapp} />
              {formatSocialLink(COMMUNITY_LINKS.whatsapp)}
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
      {/* Track-specific duration — the shared application process appears above the form. */}
      {track.apply.showProcessSection && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-6 py-4 border-b border-border" style={{ backgroundColor: `${track.accentColor}15` }}>
            <h2 className="text-base font-semibold text-foreground">Residency Duration</h2>
          </div>
          <div className="px-6 py-5">
            <p className="text-sm text-foreground">At least one month</p>
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
          <Label htmlFor={fieldId('fullName')}>
            Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id={fieldId('fullName')}
            autoComplete="name"
            aria-invalid={!!errors.fullName || undefined}
            value={formData.fullName}
            onChange={(e) => handleInputChange('fullName', e.target.value)}
            placeholder="Your name"
          />
          <FieldError message={errors.fullName} />
        </div>

        <div className="space-y-2">
          <Label htmlFor={fieldId('email')}>
            Email <span className="text-red-500">*</span>
          </Label>
          <Input
            id={fieldId('email')}
            type="email"
            autoComplete="email"
            aria-invalid={!!errors.email || undefined}
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            placeholder="your@email.com"
          />
          <FieldError message={errors.email} />
        </div>

        <div className="space-y-2">
          <Label htmlFor={fieldId('telegramOrWhatsapp')}>
            Contact <span className="text-red-500">*</span>
          </Label>
          <div className="flex gap-2">
            {(['telegram', 'whatsapp'] as const).map((method) => (
              <button
                key={method}
                type="button"
                aria-pressed={formData.contactMethod === method}
                onClick={() => {
                  handleInputChange('contactMethod', method)
                  setErrors((prev) => (prev.telegramOrWhatsapp ? { ...prev, telegramOrWhatsapp: undefined } : prev))
                }}
                className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                  formData.contactMethod === method
                    ? 'bg-foreground text-background border-foreground'
                    : 'border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                {method === 'telegram' ? 'Telegram' : 'WhatsApp'}
              </button>
            ))}
          </div>
          <Input
            id={fieldId('telegramOrWhatsapp')}
            type={formData.contactMethod === 'whatsapp' ? 'tel' : 'text'}
            inputMode={formData.contactMethod === 'whatsapp' ? 'tel' : undefined}
            autoComplete={formData.contactMethod === 'whatsapp' ? 'tel' : 'off'}
            aria-invalid={!!errors.telegramOrWhatsapp || undefined}
            value={formData.telegramOrWhatsapp}
            onChange={(e) => handleInputChange('telegramOrWhatsapp', e.target.value)}
            placeholder={formData.contactMethod === 'whatsapp' ? '+66 81 234 5678' : '@username'}
          />
          <FieldError message={errors.telegramOrWhatsapp} />
        </div>
      </div>

      {/* Visit Details */}
      <div className="space-y-6">
        <h2 className="text-sm font-semibold text-muted-foreground tracking-wider">VISIT DETAILS</h2>

        <div className="space-y-2">
          <Label htmlFor={fieldId('preferredStartDate')}>
            Preferred Start Date <span className="text-red-500">*</span>
          </Label>
          <Select
            value={formData.preferredStartDate}
            onValueChange={(v) => handleInputChange('preferredStartDate', v)}
          >
            <SelectTrigger
              id={fieldId('preferredStartDate')}
              className="w-full"
              aria-invalid={!!errors.preferredStartDate || undefined}
            >
              <SelectValue placeholder="Select a start date" />
            </SelectTrigger>
            <SelectContent>
              {startDateOptions.map(({ value, label }) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError message={errors.preferredStartDate} />
        </div>

        <div className="space-y-2">
          <Label htmlFor={fieldId('country')}>
            Country/Region <span className="text-red-500">*</span>
          </Label>
          <CountryCombobox
            id={fieldId('country')}
            value={formData.country}
            onChange={(v) => handleInputChange('country', v)}
            invalid={!!errors.country}
          />
          <FieldError message={errors.country} />
        </div>
      </div>

      {/* About You */}
      <div className="space-y-6">
        <h2 className="text-sm font-semibold text-muted-foreground tracking-wider">ABOUT YOU</h2>

        <div className="space-y-2">
          <Label htmlFor={fieldId('about')}>
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
            id={fieldId('about')}
            aria-invalid={!!errors.about || undefined}
            value={formData.about}
            onChange={(e) => handleInputChange('about', e.target.value)}
            placeholder="Tell us about yourself..."
            rows={6}
            className={isAboutOverLimit ? 'border-red-500 focus-visible:ring-red-500' : ''}
          />
          <p className={`text-xs ${isAboutOverLimit ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
            {aboutWordCount}/300 words {isAboutOverLimit && '- Please reduce your response'}
          </p>
          <FieldError message={errors.about} />
        </div>

        <div className="space-y-2">
          <Label htmlFor={fieldId('contribution')}>
            How do you plan to contribute during your stay? <span className="text-red-500">*</span>
          </Label>
          <p className="text-sm text-muted-foreground">
            Please describe one or two concrete ways you hope to contribute to the 4Seas community during your
            residency. This could include sharing knowledge, leading a session, helping with operations, creating
            content, supporting research, cooking, building projects, or anything else that creates value for others.
          </p>
          <Textarea
            id={fieldId('contribution')}
            aria-invalid={!!errors.contribution || undefined}
            maxLength={5000}
            value={formData.contribution}
            onChange={(e) => handleInputChange('contribution', e.target.value)}
            placeholder="Describe your planned contribution..."
            rows={5}
            className={isContributionOverLimit ? 'border-red-500 focus-visible:ring-red-500' : ''}
          />
          <p className={`text-xs ${isContributionOverLimit ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
            {contributionWordCount}/300 words {isContributionOverLimit && '- Please reduce your response'}
          </p>
          <FieldError message={errors.contribution} />
        </div>

        <div className="space-y-2">
          <Label htmlFor={fieldId('pastContribution')}>
            Tell us about a time you contributed to a community. <span className="text-red-500">*</span>
          </Label>
          <p className="text-sm text-muted-foreground">
            Briefly describe a project, community, or team where you actively contributed. What did you do, and what
            was the impact?
          </p>
          <Textarea
            id={fieldId('pastContribution')}
            aria-invalid={!!errors.pastContribution || undefined}
            maxLength={5000}
            value={formData.pastContribution}
            onChange={(e) => handleInputChange('pastContribution', e.target.value)}
            placeholder="Share a past contribution experience..."
            rows={5}
            className={isPastContributionOverLimit ? 'border-red-500 focus-visible:ring-red-500' : ''}
          />
          <p className={`text-xs ${isPastContributionOverLimit ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
            {pastContributionWordCount}/300 words {isPastContributionOverLimit && '- Please reduce your response'}
          </p>
          <FieldError message={errors.pastContribution} />
        </div>

        <div className="space-y-2">
          <Label htmlFor={fieldId('participationCommitment')}>
            What commitment are you willing to make during your stay? <span className="text-red-500">*</span>
          </Label>
          <p className="text-sm text-muted-foreground">
            4Seas is a community built by people who both learn and contribute. What level of participation can we
            realistically expect from you during your residency?
          </p>
          <Textarea
            id={fieldId('participationCommitment')}
            aria-invalid={!!errors.participationCommitment || undefined}
            maxLength={5000}
            value={formData.participationCommitment}
            onChange={(e) => handleInputChange('participationCommitment', e.target.value)}
            placeholder="Describe your expected level of participation..."
            rows={5}
            className={isParticipationCommitmentOverLimit ? 'border-red-500 focus-visible:ring-red-500' : ''}
          />
          <p className={`text-xs ${isParticipationCommitmentOverLimit ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
            {participationCommitmentWordCount}/300 words {isParticipationCommitmentOverLimit && '- Please reduce your response'}
          </p>
          <FieldError message={errors.participationCommitment} />
        </div>
      </div>

      {/* Social Links */}
      <div className="space-y-6">
        <h2 className="text-sm font-semibold text-muted-foreground tracking-wider">SOCIAL LINKS</h2>

        <div className="space-y-2">
          <Label htmlFor={fieldId('primaryLink')}>
            {track.apply.primaryLinkLabel} <span className="text-red-500">*</span>
          </Label>
          <p className="text-sm text-muted-foreground">At least provide one link, so that we can know a bit more from you.</p>
          <Input
            id={fieldId('primaryLink')}
            inputMode="url"
            autoComplete="url"
            aria-invalid={!!errors.primaryLink || undefined}
            value={formData.primaryLink}
            onChange={(e) => handleInputChange('primaryLink', e.target.value)}
            placeholder="https://..."
          />
          <FieldError message={errors.primaryLink} />
        </div>

        <div className="space-y-2">
          <Label htmlFor={fieldId('linkedin')}>LinkedIn</Label>
          <Input
            id={fieldId('linkedin')}
            inputMode="url"
            value={formData.linkedin}
            onChange={(e) => handleInputChange('linkedin', e.target.value)}
            placeholder="https://linkedin.com/in/..."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={fieldId('extraLink')}>{track.apply.extraLinkLabel}</Label>
          {track.apply.extraLinkHint && <p className="text-sm text-muted-foreground">{track.apply.extraLinkHint}</p>}
          <Input
            id={fieldId('extraLink')}
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
          <Label htmlFor={fieldId('contentStudioPlans')}>
            Do you have any plans to use the Content Studio during your residency?
          </Label>
          <p className="text-sm text-muted-foreground">
            We have a fully equipped content studio available for residents. Let us know if you have any content
            creation plans (podcasts, videos, interviews, etc.)
          </p>
          <Textarea
            id={fieldId('contentStudioPlans')}
            maxLength={5000}
            value={formData.contentStudioPlans}
            onChange={(e) => handleInputChange('contentStudioPlans', e.target.value)}
            placeholder="Your content creation plans (optional)"
            rows={3}
          />
        </div>
      </div>

      {serverError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">{serverError}</p>
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
