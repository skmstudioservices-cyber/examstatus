import { config, fields, collection } from '@keystatic/core';

export default config({
  storage: {
    kind: 'local' // Switch to 'github' for production Cloudflare Pages integration
  },
  collections: {
    exams: collection({
      label: 'Exams & Job Posts',
      slugField: 'title',
      path: 'src/content/exams/*/',
      format: { data: 'json' },
      schema: {
        title: fields.slug({ name: { label: 'Exam / Post Title' } }),
        category: fields.select({
          label: 'Display Column (Category)',
          options: [
            { label: 'Latest Jobs', value: 'latest-jobs' },
            { label: 'Admit Cards', value: 'admit-cards' },
            { label: 'Results', value: 'results' },
            { label: 'Answer Keys', value: 'answer-keys' }
          ],
          defaultValue: 'latest-jobs'
        }),
        jobCategories: fields.multiselect({
          label: 'Job Sectors / Taxonomy',
          options: [
            { label: 'Engineering', value: 'Engineering' },
            { label: 'Medical', value: 'Medical' },
            { label: 'Civil Services', value: 'Civil Services' },
            { label: 'Banking', value: 'Banking' },
            { label: 'Defense', value: 'Defense' },
            { label: 'Police', value: 'Police' },
            { label: 'Teaching', value: 'Teaching' },
            { label: 'Railway', value: 'Railway' },
            { label: 'Central Govt', value: 'Central Govt' },
            { label: 'State Govt', value: 'State Govt' }
          ]
        }),
        qualifications: fields.multiselect({
          label: 'Eligibility Filters (For Homepage)',
          options: [
            { label: '10th Pass', value: '10th Pass' },
            { label: '12th Pass', value: '12th Pass' },
            { label: 'Diploma', value: 'Diploma' },
            { label: 'Graduate', value: 'Graduate' },
            { label: 'B.Tech / B.E.', value: 'B.Tech' },
            { label: 'Post Graduate', value: 'Post Graduate' },
            { label: 'Ph.D', value: 'Ph.D' }
          ]
        }),
        status: fields.text({ label: 'Status Tag', defaultValue: 'Active' }),
        organization: fields.text({ label: 'Hiring Authority / Organization' }),
        postName: fields.text({ label: 'Specific Post Name' }),
        totalVacancies: fields.number({ label: 'Total Number of Vacancies' }),
        coverImage: fields.text({ label: 'Cover Image URL', defaultValue: '/images/default-banner.webp' }),
        startDate: fields.text({ label: 'Application Start Date' }),
        closingDate: fields.text({ label: 'Application Closing Date' }),
        examDate: fields.text({ label: 'Exam Date / Schedule', defaultValue: 'Notified Soon' }),
        admitCardDate: fields.text({ label: 'Admit Card Date', defaultValue: 'Before Exam' }),
        resultDate: fields.text({ label: 'Result Date', defaultValue: 'To be declared' }),
        fees: fields.array(
          fields.object({
            category: fields.text({ label: 'Category' }),
            amount: fields.text({ label: 'Fee' })
          }),
          { label: 'Fee Structure', itemLabel: props => `${props.fields.category.value}: ${props.fields.amount.value}` }
        ),
        minAge: fields.text({ label: 'Min Age', defaultValue: '18 Years' }),
        maxAge: fields.text({ label: 'Max Age', defaultValue: '30 Years' }),
        eligibility: fields.array(
          fields.object({
            postName: fields.text({ label: 'Post Name' }),
            totalPosts: fields.text({ label: 'Posts' }),
            qualification: fields.text({ label: 'Detailed Qualification Requirement' })
          }),
          { label: 'Eligibility Matrix', itemLabel: props => `${props.fields.postName.value} (${props.fields.totalPosts.value} Posts)` }
        ),
        officialUrl: fields.text({ label: 'Official Portal URL' }),
        applyOnlineUrl: fields.text({ label: 'Apply Online Link' }),
        notificationPdfUrl: fields.text({ label: 'Notification PDF Link' })
      }
    })
  }
});
