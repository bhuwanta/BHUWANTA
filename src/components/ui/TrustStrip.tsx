import { MapPin, FileText, CalendarDays } from 'lucide-react'
const items = [
  { icon: MapPin, label: 'Explore locations around Hyderabad' },
  { icon: FileText, label: 'Review project documents' },
  { icon: CalendarDays, label: 'Book a free site visit' },
]
export function TrustStrip() {
  return (
    <div className="trust-strip">
      <div className="site-container">
        {items.map(({ icon: Icon, label }) => (
          <span key={label}>
            <Icon size={16} aria-hidden="true" />
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}
