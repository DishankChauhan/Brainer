'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Crown, Zap, AlertCircle, Sparkles } from 'lucide-react'
import { SUBSCRIPTION_PLANS, SubscriptionPlan } from '@/lib/stripe'

interface SubscriptionBannerProps {
  userPlan: SubscriptionPlan
  usage: {
    notesCreated: number
    aiSummaries: number
    voiceTranscriptions: number
    screenshots: number
    embeddings: number
  }
}

export function SubscriptionBanner({ userPlan, usage }: SubscriptionBannerProps) {
  const router = useRouter()
  const [isExpanded, setIsExpanded] = useState(false)
  
  const planConfig = SUBSCRIPTION_PLANS[userPlan]
  const isFreePlan = userPlan === 'FREE'

  // Check if any limits are being approached (80% threshold)
  const getUsageWarnings = () => {
    const warnings = []
    
    if (planConfig.limits.maxNotes > 0) {
      const notesPercent = (usage.notesCreated / planConfig.limits.maxNotes) * 100
      if (notesPercent >= 80) {
        warnings.push(`Notes: ${usage.notesCreated}/${planConfig.limits.maxNotes}`)
      }
    }
    
    if (planConfig.limits.maxAISummaries > 0) {
      const summariesPercent = (usage.aiSummaries / planConfig.limits.maxAISummaries) * 100
      if (summariesPercent >= 80) {
        warnings.push(`AI Summaries: ${usage.aiSummaries}/${planConfig.limits.maxAISummaries}`)
      }
    }
    
    return warnings
  }

  const warnings = getUsageWarnings()
  const hasWarnings = warnings.length > 0

  const getPlanIcon = () => {
    switch (userPlan) {
      case 'FREE':
        return <Zap className="w-4 h-4" />
      case 'PRO':
        return <Sparkles className="w-4 h-4" />
      case 'PREMIUM':
        return <Crown className="w-4 h-4" />
      default:
        return <Zap className="w-4 h-4" />
    }
  }

  const getPlanColor = () => {
    switch (userPlan) {
      case 'FREE':
        return 'bg-gray-100 text-gray-700 border-gray-200'
      case 'PRO':
        return 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-indigo-500'
      case 'PREMIUM':
        return 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-yellow-400'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  if (!isFreePlan && !hasWarnings) {
    return null // Don't show banner for paid plans without warnings
  }

  return (
    <div className={`border rounded-lg p-4 mb-6 ${hasWarnings ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full border ${getPlanColor()}`}>
            {getPlanIcon()}
            <span className="text-sm font-medium">{planConfig.name} Plan</span>
          </div>
          
          {hasWarnings && (
            <div className="flex items-center space-x-1 text-amber-600">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Approaching Limits</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-3">
          {isExpanded && (
            <div className="text-sm text-gray-600">
              {warnings.length > 0 && (
                <span className="text-amber-600 font-medium">
                  {warnings.join(', ')}
                </span>
              )}
            </div>
          )}
          
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            {isExpanded ? 'Hide Details' : 'Show Usage'}
          </button>
          
          {isFreePlan && (
            <button
              onClick={() => router.push('/pricing')}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all"
            >
              Upgrade Now
            </button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">Notes</div>
              <div className="text-sm font-medium">
                {planConfig.limits.maxNotes === -1 ? 'Unlimited' : `${usage.notesCreated}/${planConfig.limits.maxNotes}`}
              </div>
            </div>
            
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">AI Summaries</div>
              <div className="text-sm font-medium">
                {planConfig.limits.maxAISummaries === -1 ? 'Unlimited' : `${usage.aiSummaries}/${planConfig.limits.maxAISummaries}`}
              </div>
            </div>
            
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">Voice Notes</div>
              <div className="text-sm font-medium">
                {planConfig.limits.maxVoiceTranscriptions === -1 ? 'Unlimited' : `${usage.voiceTranscriptions}/${planConfig.limits.maxVoiceTranscriptions}`}
              </div>
            </div>
            
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">Screenshots</div>
              <div className="text-sm font-medium">
                {planConfig.limits.maxScreenshots === -1 ? 'Unlimited' : `${usage.screenshots}/${planConfig.limits.maxScreenshots}`}
              </div>
            </div>
            
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">Search Enabled</div>
              <div className="text-sm font-medium">
                {planConfig.limits.maxEmbeddings === -1 ? 'Unlimited' : `${usage.embeddings}/${planConfig.limits.maxEmbeddings}`}
              </div>
            </div>
          </div>

          {isFreePlan && (
            <div className="mt-4 p-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200">
              <div className="flex items-start space-x-3">
                <Sparkles className="w-5 h-5 text-indigo-600 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-indigo-900">Unlock Pro Features</div>
                  <div className="text-xs text-indigo-700 mt-1">
                    Get unlimited notes, AI summaries, voice transcription, and memory recall for just ${SUBSCRIPTION_PLANS.PRO.price}/month
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
} 