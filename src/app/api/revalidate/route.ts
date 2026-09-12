import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'

export async function POST(request: NextRequest) {
  try {
    const secret = request.headers.get('x-revalidation-secret')
    
    if (secret !== process.env.REVALIDATION_SECRET) {
      return NextResponse.json({ error: 'Invalid secret' }, { status: 401 })
    }

    const body = await request.json()
    const { _type, slug } = body

    // Helper to bypass Next.js canary typings expecting 2 arguments
    const safeRevalidateTag = (tag: string) => {
      // @ts-expect-error - Next.js typings are incorrect in this canary version
      revalidateTag(tag)
    }

    // Revalidate based on Sanity document type
    switch (_type) {
      case 'home':
        safeRevalidateTag('home')
        revalidatePath('/')
        break
      case 'about':
        safeRevalidateTag('about')
        revalidatePath('/about')
        break
      case 'gallery':
        safeRevalidateTag('gallery')
        revalidatePath('/gallery')
        break
      case 'projects':
        safeRevalidateTag('projects')
        revalidatePath('/projects')
        // Each project's own pages, including /projects/<slug>/videos. The tag
        // above covers the data fetch; these make the pages regenerate rather
        // than waiting out their own 60s window.
        revalidatePath('/projects/[slug]', 'page')
        revalidatePath('/projects/[slug]/videos', 'page')
        // The homepage reads the same project list — its categories section
        // and its "Ongoing Projects" count, which is derived from the number
        // of published projects. Without this, publishing a project left the
        // homepage showing the old count until its own 60s revalidate window
        // expired. The tag above already covers the data fetch; this makes
        // the page itself regenerate rather than relying on that alone.
        revalidatePath('/')
        break
      case 'blog':
        safeRevalidateTag('blog')
        revalidatePath('/blog')
        if (slug?.current) {
          revalidatePath(`/blog/${slug.current}`)
        }
        break
      case 'careers':
        safeRevalidateTag('careers')
        revalidatePath('/careers')
        break

      default:
        // Revalidate all public pages
        revalidatePath('/', 'layout')
    }

    return NextResponse.json({ revalidated: true, type: _type })
  } catch (error) {
    console.error('Revalidation error:', error)
    return NextResponse.json({ error: 'Revalidation failed' }, { status: 500 })
  }
}
