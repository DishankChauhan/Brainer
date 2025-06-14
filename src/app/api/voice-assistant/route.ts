import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import { voiceAssistantSchema } from '@/lib/input-validation';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  tags: { id: string; name: string; color: string }[];
}

async function voiceAssistantHandler(
  request: AuthenticatedRequest,
  validatedData: { query: string; notes?: Note[]; userId?: string }
) {
  try {
    const { query, notes = [] } = validatedData
    const userId = request.user.uid // Get userId from authenticated user

    // Enhanced Hindi detection
    const isHindi = /[\u0900-\u097F]/.test(query) || 
                   query.toLowerCase().includes('namaste') ||
                   query.toLowerCase().includes('namaskar') ||
                   query.toLowerCase().includes('hindi') ||
                   query.toLowerCase().includes('हिंदी') ||
                   query.toLowerCase().includes('नोट') ||
                   query.toLowerCase().includes('खोज') ||
                   query.toLowerCase().includes('बना') ||
                   query.toLowerCase().includes('मदद') ||
                   query.toLowerCase().includes('कैसे')

    // Enhanced prompt with better Hindi context
    const systemPrompt = `You are Brainer, a helpful AI assistant for a note-taking app. You can communicate in both English and Hindi naturally.

LANGUAGE RULES:
- If user speaks in Hindi/Devanagari script, respond ONLY in Hindi
- If user mentions Hindi words or phrases, respond in Hindi
- Keep the same language throughout the conversation
- Be natural and conversational, not robotic

BRAINER APP FEATURES:
1. Voice Notes: Users can record audio and get automatic transcription
2. OCR/Screenshots: Extract text from images
3. Manual Notes: Create/edit text notes with markdown support
4. AI Summaries: Generate intelligent summaries of notes
5. Tags: Organize notes with colored tags
6. Search: Find notes by content, title, or tags
7. Cloud Storage: All notes synced securely

AVAILABLE ACTIONS:
- search: Find existing notes
- create_note: Create new notes with title, content, and tags
- help: Explain app features
- welcome: Greet new users

RESPONSE FORMAT: Always respond with a JSON object containing:
{
  "response": "Natural conversational response in appropriate language",
  "action": "search|create_note|help|welcome",
  "language": "english|hindi",
  "foundNotes": ["note_id1", "note_id2"] (if search results),
  "noteData": {
    "title": "extracted title",
    "content": "extracted content", 
    "tags": ["tag1", "tag2"]
  } (if creating note),
  "askSummary": false
}

Current notes: ${JSON.stringify(notes.map((n: Note) => ({ id: n.id, title: n.title, content: n.content.substring(0, 200) })))}

User Query: "${query}"
Language Detected: ${isHindi ? 'Hindi' : 'English'}`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 800
    })

    const aiResponse = response.choices[0]?.message?.content
    
    if (!aiResponse) {
      throw new Error('No response from AI')
    }

    try {
      const parsedResponse = JSON.parse(aiResponse)
      
      // Ensure language is correctly set
      if (isHindi && parsedResponse.language !== 'hindi') {
        parsedResponse.language = 'hindi'
      }
      
      // Handle specific actions
      if (parsedResponse.action === 'search' && parsedResponse.foundNotes) {
        // Validate found notes exist
        parsedResponse.foundNotes = parsedResponse.foundNotes.filter((id: string) => 
          notes.some((note: Note) => note.id === id)
        )
      }

      if (parsedResponse.action === 'create_note') {
        // Extract note data from the query if not provided
        if (!parsedResponse.noteData || !parsedResponse.noteData.title) {
          if (isHindi) {
            parsedResponse.noteData = {
              title: "नया नोट",
              content: query,
              tags: []
            }
          } else {
            parsedResponse.noteData = {
              title: "New Note",
              content: query,
              tags: []
            }
          }
        }
      }

      return NextResponse.json(parsedResponse)

    } catch (parseError) {
      // Fallback response
      return NextResponse.json({
        response: isHindi 
          ? "माफ करें, मुझे आपकी बात समझने में दिक्कत हुई। कृपया फिर से कोशिश करें।"
          : "I'm sorry, I didn't understand that properly. Could you please try again?",
        action: "help",
        language: isHindi ? "hindi" : "english",
        foundNotes: [],
        askSummary: false
      })
    }

  } catch (error) {
    return NextResponse.json({
      response: "I'm experiencing some technical difficulties. Please try again.",
      action: "help", 
      language: "english",
      foundNotes: [],
      askSummary: false
    }, { status: 500 })
  }
}

// Export handler with authentication and input validation
export const POST = withAuth(
  async (request: AuthenticatedRequest) => {
    try {
      const body = await request.json()
      const validatedData = voiceAssistantSchema.parse(body)
      return await voiceAssistantHandler(request, validatedData)
    } catch (error) {
      return NextResponse.json({
        error: 'Invalid input format'
      }, { status: 400 })
    }
  }
) 