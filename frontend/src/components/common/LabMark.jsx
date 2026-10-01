export default function LabMark({ className = '', size = 36 }) {
  return <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={className} aria-hidden="true">
    <rect width="40" height="40" rx="12" fill="currentColor" />
    <path d="M18 12.5c-3.6-2-7-1.8-9-1v16c3-1 6.5-.6 11 2.1 4.5-2.7 8-3.1 11-2.1v-16c-2-.8-5.4-1-9 1" stroke="var(--mark-ink, #E0F1BC)" strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M20 15v14.5M15.5 17l-3 3 3 3M24.5 17l3 3-3 3" stroke="var(--mark-ink, #E0F1BC)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
}
