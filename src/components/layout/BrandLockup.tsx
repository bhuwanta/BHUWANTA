import Image from 'next/image'
import logo from '@/images/bhuwanta-logo-horizontal.png'

/** The approved artwork's monogram, with a wordmark readable at navigation size. */
export function BrandLockup({ tagline = false, priority = false }: { tagline?: boolean; priority?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5 sm:gap-3" aria-label="Bhuwanta Developers Pvt Ltd">
      <span className="brand-symbol" aria-hidden="true">
        <Image src={logo} alt="" sizes="224px" priority={priority} />
      </span>
      <span className="flex flex-col text-brand-gold">
        <span className="text-[17px] sm:text-xl font-bold tracking-[0.13em] leading-tight">BHUWANTA</span>
        <span className="mt-1 text-[8px] sm:text-[9px] font-medium tracking-[0.19em] leading-tight">DEVELOPERS PVT LTD</span>
        {tagline && <span className="mt-2 text-[9px] sm:text-[10px] tracking-[0.12em] text-white/70">YOUR LAND. YOUR LEGACY.</span>}
      </span>
    </span>
  )
}
