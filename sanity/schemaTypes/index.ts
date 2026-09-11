import { homeSchema } from './home'
import { aboutSchema } from './about'

import { projectsSchema } from './projects'
import { blogSchema } from './blog'
import { gallerySchema } from './gallery'
import { siteSettingsSchema } from './siteSettings'
import { autoresponderSchema } from './autoresponder'
import { leadSchema } from './lead'
import { projectCategorySchema } from './projectCategory'
import { reviewsSchema } from './reviews'

export const schemaTypes = [
  siteSettingsSchema,
  projectCategorySchema,
  autoresponderSchema,
  leadSchema,
  homeSchema,
  aboutSchema,

  projectsSchema,
  blogSchema,
  gallerySchema,
  reviewsSchema,
]
