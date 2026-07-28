'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  ArrowUpRight,
  Home,
  Users,
  Lightbulb,
  Mic,
  Globe,
  BookOpen,
  Calendar,
  CheckCircle,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/shared/header'
import { Footer } from '@/components/shared/footer'
import { formatSocialLink, SocialPlatformIcon } from '@/components/shared/social-platform-icon'
import { SITE, COMMUNITY_LINKS } from '@/lib/content/site'
import { TRACKS, TRACK_IDS, type TrackConfig } from '@/lib/content/tracks'

const ICONS: Record<string, LucideIcon> = {
  home: Home,
  users: Users,
  lightbulb: Lightbulb,
  mic: Mic,
  globe: Globe,
  'book-open': BookOpen,
  calendar: Calendar,
  'check-circle': CheckCircle,
}

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 },
}

function TrackCard({ track, index }: { track: TrackConfig; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.15 }}
      className="group relative bg-card border border-border rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300"
    >
      <div className="relative h-36 md:h-48 overflow-hidden">
        <img
          src={track.image}
          alt=""
          loading="lazy"
          className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
        <div
          className="absolute top-3 left-3 md:top-4 md:left-4 px-2 py-0.5 md:px-3 md:py-1 rounded-full text-xs md:text-sm font-medium backdrop-blur-sm bg-background/70"
          style={{ color: track.accentColor }}
        >
          {track.state === 'open' ? 'Now Open' : track.state === 'coming_soon' ? 'Coming Soon' : 'Closed'}
        </div>
      </div>

      <div className="p-4 md:p-8">
        <h3 className="text-lg md:text-2xl font-sans font-semibold text-foreground mb-2 md:mb-3">{track.name}</h3>
        <p className="text-sm md:text-base text-muted-foreground mb-4 md:mb-6 leading-relaxed">
          {track.card.description}
        </p>

        <div className="flex flex-wrap gap-1.5 md:gap-2 mb-4 md:mb-8">
          {track.card.themes.map((theme) => (
            <span
              key={theme}
              className="px-2 md:px-3 py-0.5 md:py-1 text-[10px] md:text-xs font-medium bg-muted text-muted-foreground rounded-full"
            >
              {theme}
            </span>
          ))}
        </div>

        <div className="flex gap-3">
          <Link href={`/${track.id}`} className="flex-1">
            <Button variant="outline" className="w-full group/btn">
              Explore {track.shortName}
              <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </div>
    </motion.div>
  )
}

export function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="relative py-12 md:py-20 overflow-hidden min-h-[50vh] md:min-h-[60vh] flex items-center">
        <div className="absolute inset-0">
          <img src={SITE.hero.image} alt="" className="w-full h-full object-cover object-center" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background/80" />
        </div>
        <div className="relative max-w-5xl mx-auto px-4 text-center">
          <motion.div {...fadeIn}>
            <p className="text-xs md:text-sm uppercase tracking-widest text-muted-foreground mb-3 md:mb-4">
              {SITE.hero.location}
            </p>
            <h1 className="text-2xl md:text-5xl lg:text-6xl font-sans font-semibold text-foreground mb-4 md:mb-6 text-balance leading-tight">
              {SITE.hero.title}
            </h1>
            <p className="text-base md:text-xl text-muted-foreground mb-3 md:mb-4 font-light">{SITE.hero.tagline}</p>
            <p className="text-sm md:text-lg text-muted-foreground max-w-3xl mx-auto mb-6 md:mb-10 leading-relaxed">
              {SITE.hero.description}
            </p>

            <div className="flex justify-center">
              <Link href="#programs">
                <Button size="lg" className="bg-primary text-primary-foreground gap-2">
                  Explore
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Shared Experience */}
      <section className="py-10 md:py-12 bg-muted/30">
        <div className="max-w-5xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-8 md:mb-12"
          >
            <h2 className="text-xl md:text-3xl lg:text-4xl font-sans font-semibold text-foreground mb-3 md:mb-4">
              {SITE.sharedExperience.title}
            </h2>
            <p className="text-sm md:text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              {SITE.sharedExperience.description}
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
            {SITE.sharedExperience.items.map((item, index) => {
              const Icon = ICONS[item.icon] ?? Home
              return (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-card border border-border rounded-xl p-4 md:p-6 text-center"
                >
                  <div className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-3 md:mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                    <Icon className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                  </div>
                  <h3 className="text-sm md:text-base font-semibold text-foreground mb-1 md:mb-2">{item.title}</h3>
                  <p className="text-xs md:text-sm text-muted-foreground">{item.desc}</p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Tracks */}
      <section id="programs" className="py-10 md:py-12 scroll-mt-20">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-8 md:mb-12"
          >
            <h2 className="text-xl md:text-3xl lg:text-4xl font-sans font-semibold text-foreground mb-3 md:mb-4">
              {SITE.tracksSection.title}
            </h2>
            <p className="text-sm md:text-lg text-muted-foreground max-w-2xl mx-auto">
              {SITE.tracksSection.description}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {TRACK_IDS.map((id, index) => (
              <TrackCard key={id} track={TRACKS[id]} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* What 4Seas Offers */}
      <section className="py-10 md:py-12 bg-muted/30">
        <div className="max-w-5xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-8 md:mb-12"
          >
            <h2 className="text-xl md:text-3xl lg:text-4xl font-sans font-semibold text-foreground mb-3 md:mb-4">
              {SITE.offers.title}
            </h2>
            <p className="text-sm md:text-lg text-muted-foreground max-w-2xl mx-auto">{SITE.offers.description}</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
            {SITE.offers.items.map((item, index) => {
              const Icon = ICONS[item.icon] ?? Home
              return (
                <motion.div
                  key={item.text}
                  initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-start gap-3 md:gap-4 p-3 md:p-4 bg-card border border-border rounded-lg"
                >
                  <div className="w-8 h-8 md:w-10 md:h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                  </div>
                  <p className="text-sm md:text-base text-foreground pt-1 md:pt-2">{item.text}</p>
                </motion.div>
              )
            })}
          </div>

          <p className="text-xs md:text-sm text-muted-foreground text-center mt-6 md:mt-8 italic">
            {SITE.offers.disclaimer}
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-10 md:py-12">
        <div className="max-w-5xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-8 md:mb-16"
          >
            <h2 className="text-xl md:text-3xl lg:text-4xl font-sans font-semibold text-foreground mb-3 md:mb-4">
              {SITE.howItWorks.title}
            </h2>
          </motion.div>

          <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-4">
            {SITE.howItWorks.steps.map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <div className="w-8 h-8 md:w-12 md:h-12 mx-auto mb-2 md:mb-3 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold text-xs md:text-sm">
                  {item.step}
                </div>
                <h3 className="font-semibold text-foreground mb-1 text-[10px] md:text-sm">{item.title}</h3>
                <p className="text-[9px] md:text-xs text-muted-foreground hidden md:block">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Who We Welcome */}
      <section className="py-10 md:py-12 bg-muted/30">
        <div className="max-w-5xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-6 md:mb-12"
          >
            <h2 className="text-xl md:text-3xl lg:text-4xl font-sans font-semibold text-foreground mb-3 md:mb-4">
              {SITE.whoWeWelcome.title}
            </h2>
            <p className="text-sm md:text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              {SITE.whoWeWelcome.description}
            </p>
          </motion.div>

          <div className="flex flex-wrap justify-center gap-2 md:gap-3">
            {SITE.whoWeWelcome.roles.map((role, index) => (
              <motion.span
                key={role}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="px-3 py-1.5 md:px-4 md:py-2 bg-card border border-border rounded-full text-foreground text-xs md:text-sm font-medium"
              >
                {role}
              </motion.span>
            ))}
          </div>
        </div>
      </section>

      {/* Explore More */}
      <section className="py-10 md:py-16 bg-muted/30">
        <div className="max-w-6xl mx-auto px-4">
          <motion.h2
            className="text-xl md:text-3xl lg:text-4xl font-sans font-semibold text-foreground mb-6 md:mb-12 text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            {SITE.exploreMore.title}
          </motion.h2>

          <div className="grid md:grid-cols-3 gap-4 md:gap-6">
            {SITE.exploreMore.cards.map((card, index) => (
              <motion.div
                key={card.title}
                className="bg-card rounded-2xl p-4 md:p-8 border border-border hover:shadow-lg transition-all duration-300 flex flex-col"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <h3 className="text-lg md:text-2xl font-semibold text-foreground mb-2 md:mb-4">{card.title}</h3>
                <p className="text-sm md:text-base text-muted-foreground mb-4 md:mb-6 leading-relaxed flex-1">
                  {card.description}
                </p>
                <a
                  href={card.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-between px-3 py-2 md:px-4 md:py-2 bg-muted rounded-lg text-foreground text-xs md:text-sm hover:bg-muted/80 transition-colors"
                >
                  {card.linkLabel}
                  <ArrowUpRight className="w-3 h-3 ml-2" />
                </a>
              </motion.div>
            ))}

            <motion.div
              className="bg-card rounded-2xl p-4 md:p-8 border border-border hover:shadow-lg transition-all duration-300 flex flex-col"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <h3 className="text-lg md:text-2xl font-semibold text-foreground mb-2 md:mb-4">
                {SITE.exploreMore.joinCard.title}
              </h3>
              <p className="text-sm md:text-base text-muted-foreground mb-4 md:mb-6 leading-relaxed flex-1">
                {SITE.exploreMore.joinCard.description}
              </p>
              <div className="space-y-2 mt-auto">
                <a
                  href={COMMUNITY_LINKS.telegram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-3 py-2 md:px-4 md:py-2 bg-muted rounded-lg text-foreground text-xs md:text-sm hover:bg-muted/80 transition-colors"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <SocialPlatformIcon url={COMMUNITY_LINKS.telegram} className="size-3.5 shrink-0" />
                    <span className="truncate">{formatSocialLink(COMMUNITY_LINKS.telegram)}</span>
                  </span>
                  <ArrowUpRight className="w-3 h-3" />
                </a>
                <a
                  href={COMMUNITY_LINKS.x}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-3 py-2 md:px-4 md:py-2 bg-muted rounded-lg text-foreground text-xs md:text-sm hover:bg-muted/80 transition-colors"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <SocialPlatformIcon url={COMMUNITY_LINKS.x} className="size-3.5 shrink-0" />
                    <span className="truncate">{formatSocialLink(COMMUNITY_LINKS.x)}</span>
                  </span>
                  <ArrowUpRight className="w-3 h-3" />
                </a>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
