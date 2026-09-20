import { defineType, defineField } from 'sanity'
import { UsersIcon } from '@sanity/icons'

export const leadSchema = defineType({
  name: 'lead',
  type: 'document',
  title: 'Lead Inquiries',
  icon: UsersIcon,
  readOnly: false, // Allows admin to edit notes/status
  fields: [
    defineField({
      name: 'attribution', type: 'object', title: 'Campaign metadata (browser supplied)', readOnly: true,
      fields: ['gclid', 'gbraid', 'wbraid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].map(name => ({ name, type: 'string', title: name })),
    }),
    defineField({
      name: 'name',
      type: 'string',
      title: 'Full Name',
      readOnly: true,
    }),
    defineField({
      name: 'email',
      type: 'string',
      title: 'Email Address',
      readOnly: true,
    }),
    defineField({
      name: 'phone',
      type: 'string',
      title: 'Phone Number',
      readOnly: true,
    }),
    defineField({
      name: 'budget',
      type: 'string',
      title: 'Approx. Budget',
      readOnly: true,
    }),
    defineField({
      name: 'sourcePage',
      type: 'string',
      title: 'Source',
      readOnly: true,
    }),
    defineField({
      name: 'referredBy',
      type: 'string',
      title: 'Referred By',
      readOnly: true,
    }),
    defineField({
      name: 'status',
      type: 'string',
      title: 'Lead Status',
      description: 'Update the status of this lead as you manage them.',
      options: {
        list: [
          { title: 'New', value: 'new' },
          { title: 'Contacted', value: 'contacted' },
          { title: 'Qualified', value: 'qualified' },
          { title: 'Closed/Won', value: 'closed_won' },
          { title: 'Lost', value: 'lost' },
        ],
      },
      initialValue: 'new',
    }),
    defineField({
      name: 'adminNotes',
      type: 'text',
      title: 'Admin Notes',
      description: 'Private notes for your sales team. The client will never see this.',
    }),
  ],
  preview: {
    select: {
      title: 'name',
      subtitle: 'budget',
      status: 'status',
      date: '_createdAt'
    },
    prepare(selection) {
      const { title, subtitle, status } = selection
      let emoji = '🔵'
      if (status === 'contacted') emoji = '🟡'
      if (status === 'qualified') emoji = '🔥'
      if (status === 'closed_won') emoji = '✅'
      if (status === 'lost') emoji = '❌'
      
      return {
        title: `${emoji} ${title || 'Unnamed Lead'}`,
        subtitle: subtitle ? `₹${subtitle}` : 'Budget not specified',
      }
    }
  }
})
