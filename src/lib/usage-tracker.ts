import { prisma } from '@/lib/prisma'
import { SUBSCRIPTION_PLANS, SubscriptionPlan, isLimitExceeded } from '@/lib/stripe'

export type UsageType = 'notes' | 'aiSummaries' | 'voiceTranscriptions' | 'screenshots' | 'embeddings'

interface UsageData {
  monthlyNotesCreated: number
  monthlyAISummaries: number
  monthlyVoiceTranscriptions: number
  monthlyScreenshots: number
  monthlyEmbeddings: number
  lastUsageReset: Date
  subscriptionPlan: SubscriptionPlan
}

/**
 * Get user's current usage and subscription info
 */
export async function getUserUsage(userId: string): Promise<UsageData | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        monthlyNotesCreated: true,
        monthlyAISummaries: true,
        monthlyVoiceTranscriptions: true,
        monthlyScreenshots: true,
        monthlyEmbeddings: true,
        lastUsageReset: true,
        subscriptionPlan: true
      }
    })

    if (!user) return null

    // Check if we need to reset monthly counters (new month)
    const now = new Date()
    const lastReset = new Date(user.lastUsageReset)
    const shouldReset = now.getMonth() !== lastReset.getMonth() || 
                       now.getFullYear() !== lastReset.getFullYear()

    if (shouldReset) {
      await resetMonthlyUsage(userId)
      return {
        monthlyNotesCreated: 0,
        monthlyAISummaries: 0,
        monthlyVoiceTranscriptions: 0,
        monthlyScreenshots: 0,
        monthlyEmbeddings: 0,
        lastUsageReset: now,
        subscriptionPlan: (user.subscriptionPlan as SubscriptionPlan) || 'FREE'
      }
    }

    return {
      ...user,
      subscriptionPlan: (user.subscriptionPlan as SubscriptionPlan) || 'FREE'
    }
  } catch (error) {
    console.error('Error getting user usage:', error)
    return null
  }
}

/**
 * Check if user can perform an action based on their subscription limits
 */
export async function canPerformAction(userId: string, actionType: UsageType): Promise<{
  canPerform: boolean
  reason?: string
  currentUsage?: number
  limit?: number
}> {
  try {
    const usage = await getUserUsage(userId)
    if (!usage) {
      return { canPerform: false, reason: 'User not found' }
    }

    const plan = usage.subscriptionPlan
    const planLimits = SUBSCRIPTION_PLANS[plan].limits

    let currentUsage = 0
    let limit = 0

    switch (actionType) {
      case 'notes':
        currentUsage = usage.monthlyNotesCreated
        limit = planLimits.maxNotes
        break
      case 'aiSummaries':
        currentUsage = usage.monthlyAISummaries
        limit = planLimits.maxAISummaries
        break
      case 'voiceTranscriptions':
        currentUsage = usage.monthlyVoiceTranscriptions
        limit = planLimits.maxVoiceTranscriptions
        break
      case 'screenshots':
        currentUsage = usage.monthlyScreenshots
        limit = planLimits.maxScreenshots
        break
      case 'embeddings':
        currentUsage = usage.monthlyEmbeddings
        limit = planLimits.maxEmbeddings
        break
    }

    // -1 means unlimited
    if (limit === -1) {
      return { canPerform: true, currentUsage, limit }
    }

    const canPerform = currentUsage < limit
    return {
      canPerform,
      reason: canPerform ? undefined : `Monthly limit reached (${currentUsage}/${limit})`,
      currentUsage,
      limit
    }
  } catch (error) {
    console.error('Error checking action permission:', error)
    return { canPerform: false, reason: 'Error checking limits' }
  }
}

/**
 * Increment usage counter for a specific action
 */
export async function incrementUsage(userId: string, actionType: UsageType): Promise<boolean> {
  try {
    const canPerform = await canPerformAction(userId, actionType)
    if (!canPerform.canPerform) {
      return false
    }

    const updateField = getUpdateField(actionType)
    await prisma.user.update({
      where: { id: userId },
      data: {
        [updateField]: {
          increment: 1
        }
      }
    })

    return true
  } catch (error) {
    console.error('Error incrementing usage:', error)
    return false
  }
}

/**
 * Reset monthly usage counters
 */
export async function resetMonthlyUsage(userId: string): Promise<void> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        monthlyNotesCreated: 0,
        monthlyAISummaries: 0,
        monthlyVoiceTranscriptions: 0,
        monthlyScreenshots: 0,
        monthlyEmbeddings: 0,
        lastUsageReset: new Date()
      }
    })
  } catch (error) {
    console.error('Error resetting monthly usage:', error)
  }
}

/**
 * Get usage statistics for dashboard display
 */
export async function getUsageStats(userId: string) {
  try {
    const usage = await getUserUsage(userId)
    if (!usage) return null

    const plan = usage.subscriptionPlan
    const planLimits = SUBSCRIPTION_PLANS[plan].limits

    return {
      plan,
      usage: {
        notesCreated: usage.monthlyNotesCreated,
        aiSummaries: usage.monthlyAISummaries,
        voiceTranscriptions: usage.monthlyVoiceTranscriptions,
        screenshots: usage.monthlyScreenshots,
        embeddings: usage.monthlyEmbeddings
      },
      limits: planLimits,
      percentages: {
        notes: planLimits.maxNotes === -1 ? 0 : (usage.monthlyNotesCreated / planLimits.maxNotes) * 100,
        aiSummaries: planLimits.maxAISummaries === -1 ? 0 : (usage.monthlyAISummaries / planLimits.maxAISummaries) * 100,
        voiceTranscriptions: planLimits.maxVoiceTranscriptions === -1 ? 0 : (usage.monthlyVoiceTranscriptions / planLimits.maxVoiceTranscriptions) * 100,
        screenshots: planLimits.maxScreenshots === -1 ? 0 : (usage.monthlyScreenshots / planLimits.maxScreenshots) * 100,
        embeddings: planLimits.maxEmbeddings === -1 ? 0 : (usage.monthlyEmbeddings / planLimits.maxEmbeddings) * 100
      }
    }
  } catch (error) {
    console.error('Error getting usage stats:', error)
    return null
  }
}

// Helper function to get the correct database field for each action type
function getUpdateField(actionType: UsageType): string {
  switch (actionType) {
    case 'notes':
      return 'monthlyNotesCreated'
    case 'aiSummaries':
      return 'monthlyAISummaries'
    case 'voiceTranscriptions':
      return 'monthlyVoiceTranscriptions'  
    case 'screenshots':
      return 'monthlyScreenshots'
    case 'embeddings':
      return 'monthlyEmbeddings'
    default:
      throw new Error(`Unknown action type: ${actionType}`)
  }
} 