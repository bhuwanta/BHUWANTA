import Image from 'next/image'
import logo from '@/images/bhuwanta-logo-horizontal.png'

export function BrandLockup({
  tagline = false,
  priority = false,
}: {
  tagline?: boolean
  priority?: boolean
}) {
  const filterId = tagline ? 'brand-background-footer' : 'brand-background-nav'
  return (
    <span
      className={
        tagline ? 'brand-artwork brand-artwork-footer' : 'brand-artwork'
      }
    >
      <svg width="0" height="0" aria-hidden="true" className="brand-render-filter">
        <defs>
          <filter id={filterId} colorInterpolationFilters="sRGB">
            {/* The source's dark green has almost no red. Preserve the original
                gold/orange RGB values while removing that backdrop at render time. */}
            <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  4 0 0 0 -0.25" />
          </filter>
        </defs>
      </svg>
      <Image
        src={logo}
        alt="Bhuwanta Developers Pvt Ltd: Your land. Your legacy."
        priority={priority}
        sizes={tagline ? '340px' : '(max-width: 640px) 220px, 270px'}
        className="brand-artwork-image"
        style={{ filter: `url(#${filterId})` }}
      />
    </span>
  )
}
