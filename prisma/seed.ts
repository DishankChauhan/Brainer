import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create initial tags
  const tags = await Promise.all([
    prisma.tag.upsert({
      where: { name: 'welcome' },
      update: {},
      create: {
        name: 'welcome',
        color: '#10B981'
      }
    }),
    prisma.tag.upsert({
      where: { name: 'projects' },
      update: {},
      create: {
        name: 'projects',
        color: '#3B82F6'
      }
    }),
    prisma.tag.upsert({
      where: { name: 'ideas' },
      update: {},
      create: {
        name: 'ideas',
        color: '#F59E0B'
      }
    }),
    prisma.tag.upsert({
      where: { name: 'work' },
      update: {},
      create: {
        name: 'work',
        color: '#EF4444'
      }
    }),
    prisma.tag.upsert({
      where: { name: 'personal' },
      update: {},
      create: {
        name: 'personal',
        color: '#8B5CF6'
      }
    }),
    prisma.tag.upsert({
      where: { name: 'learning' },
      update: {},
      create: {
        name: 'learning',
        color: '#06B6D4'
      }
    }),
    prisma.tag.upsert({
      where: { name: 'goals' },
      update: {},
      create: {
        name: 'goals',
        color: '#EC4899'
      }
    })
  ])

  console.log(`Created ${tags.length} tags`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 