'use client'

import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { schemaTypes } from './sanity/schemaTypes'
import {
  CogIcon,
  DocumentsIcon,
  HomeIcon,
  UsersIcon,
  ProjectsIcon,
  ImagesIcon,
  CaseIcon,
  EnvelopeIcon,
  EditIcon,
  BulbOutlineIcon,
} from '@sanity/icons'

export default defineConfig({
  name: 'bhuwanta-studio',
  title: 'Bhuwanta CMS',
  basePath: '/studio',
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'placeholder',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('Content Manager')
          .items([
            // ===== GLOBAL SETTINGS =====
            S.listItem()
              .title('Site Settings')
              .id('site-settings')
              .icon(CogIcon)
              .child(
                S.document()
                  .schemaType('siteSettings')
                  .documentId('siteSettings')
                  .title('Site Settings — Logo, SEO, Navigation, Footer')
              ),
            S.listItem()
              .title('Autoresponder Settings')
              .id('autoresponder-settings')
              .icon(EnvelopeIcon)
              .child(
                S.document()
                  .schemaType('autoresponder')
                  .documentId('autoresponder')
                  .title('Autoresponder — Email sent to new leads')
              ),
            S.divider(),

            // ===== WEBSITE PAGES =====
            S.listItem()
              .title('Website Pages')
              .id('website-pages')
              .icon(DocumentsIcon)
              .child(
                S.list()
                  .title('Edit Page Content')
                  .items([
                    S.listItem()
                      .title('Home Page')
                      .id('home-page')
                      .icon(HomeIcon)
                      .child(
                        S.document()
                          .schemaType('home')
                          .documentId('home')
                          .title('Home Page — Hero, Features, CTA')
                      ),
                    S.listItem()
                      .title('About Us')
                      .id('about-page')
                      .icon(UsersIcon)
                      .child(
                        S.document()
                          .schemaType('about')
                          .documentId('about')
                          .title('About Page — Story, Mission, Team')
                      ),
                    S.listItem()
                      .title('Projects')
                      .id('projects-page')
                      .icon(ProjectsIcon)
                      .child(
                        S.document()
                          .schemaType('projects')
                          .documentId('projects')
                          .title('Projects Page — Listings & Details')
                      ),

                    S.listItem()
                      .title('Gallery Page')
                      .id('gallery-page')
                      .icon(ImagesIcon)
                      .child(
                        S.document()
                          .schemaType('gallery')
                          .documentId('gallery')
                          .title('Gallery Page — Standalone Photos & Videos')
                      ),
                    S.listItem()
                      .title('Customer Reviews Page')
                      .id('reviews-page')
                      .icon(BulbOutlineIcon)
                      .child(
                        S.document()
                          .schemaType('reviews')
                          .documentId('customerReviewsPage')
                          .title('Reviews Page — Customer Review Videos')
                      ),
                  ])
              ),

            S.divider(),

            // ===== CRM (LEADS) =====
            S.listItem()
              .title('Leads & Inquiries')
              .id('crm-leads')
              .icon(UsersIcon)
              .child(
                S.documentTypeList('lead')
                  .title('Form Submissions')
              ),

            S.divider(),

            // ===== BLOG & CONTENT =====
            S.listItem()
              .title('Blog Posts')
              .id('blog-posts')
              .icon(EditIcon)
              .child(
                S.documentTypeList('blog')
                  .title('All Blog Posts')
              ),


          ]),
    }),
  ],
  schema: {
    types: schemaTypes,
  },
})
