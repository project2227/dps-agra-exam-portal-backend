import { useEffect, useState } from 'react'

export default function useLearningMotion(rootRef, storyRef) {
  const [step, setStep] = useState(0)
  useEffect(() => {
    const root = rootRef.current
    const story = storyRef.current
    if (!root) return
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    let frame = 0
    let observer
    const update = () => {
      if (!story) return
      if (media.matches || window.innerWidth <= 760) {
        story.style.setProperty('--story-progress', '0')
        setStep(0)
        return
      }
      const rect = story.getBoundingClientRect()
      const travel = Math.max(1, rect.height - window.innerHeight + 76)
      const progress = Math.max(0, Math.min(1, (76 - rect.top) / travel))
      story.style.setProperty('--story-progress', String(progress))
      setStep(progress < 0.32 ? 0 : progress < 0.68 ? 1 : 2)
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(() => { frame = 0; update() })
    }
    const configure = () => {
      observer?.disconnect()
      root.classList.remove('lab-reveal-ready')
      if (!media.matches && 'IntersectionObserver' in window) {
        observer = new IntersectionObserver(entries => {
          for (const entry of entries) if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed')
            observer.unobserve(entry.target)
          }
        }, { threshold: 0.08, rootMargin: '0px 0px -20px 0px' })
        root.querySelectorAll('[data-reveal]').forEach(element => observer.observe(element))
        root.classList.add('lab-reveal-ready')
      }
      update()
    }
    configure()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    media.addEventListener('change', configure)
    return () => {
      observer?.disconnect()
      cancelAnimationFrame(frame)
      root.classList.remove('lab-reveal-ready')
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      media.removeEventListener('change', configure)
    }
  }, [rootRef, storyRef])
  return step
}
