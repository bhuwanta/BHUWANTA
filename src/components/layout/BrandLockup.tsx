import Image from 'next/image'
import logo from '@/images/bhuwanta-logo-horizontal.png'

export function BrandLockup({
  tagline = false,
  priority = false,
}: {
  tagline?: boolean
  priority?: boolean
}) {
  return (
    <span
      className={
        tagline ? 'brand-artwork brand-artwork-footer' : 'brand-artwork'
      }
    >
      <Image
        src={logo}
        alt="Bhuwanta Developers Pvt Ltd: Your land. Your legacy."
        priority={priority}
        sizes={tagline ? '340px' : '(max-width: 640px) 180px, 220px'}
        className="brand-artwork-image"
      />
    </span>
  )
}
