import { Loader2 } from 'lucide-react'

export default function Loading() {
  return (
    <div className="flex h-[80vh] w-full items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-[#5a6a82]">
        <Loader2 className="h-10 w-10 animate-spin text-[#c4a55a]" />
        <p className="text-sm font-medium">Loading...</p>
      </div>
    </div>
  )
}
