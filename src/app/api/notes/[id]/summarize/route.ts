import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateSummary } from '@/lib/openai';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { forceRegenerate } = await request.json().catch(() => ({}));
    
    console.log('POST /api/notes/[id]/summarize - noteId:', id);

    // Find the note
    const note = await prisma.note.findUnique({
      where: { id },
      include: {
        tags: {
          include: {
            tag: true
          }
        }
      }
    });

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    // Check if summary already exists and force regenerate is not requested
    if (note.hasSummary && note.summary && !forceRegenerate) {
      const transformedNote = {
        id: note.id,
        title: note.title,
        content: note.content,
        createdAt: note.createdAt.toISOString(),
        updatedAt: note.updatedAt.toISOString(),
        isProcessing: note.isProcessing,
        transcriptionJobId: note.transcriptionJobId,
        transcriptionStatus: note.transcriptionStatus,
        transcriptionS3Key: note.transcriptionS3Key,
        transcriptionConfidence: note.transcriptionConfidence,
        summary: note.summary,
        summaryGeneratedAt: note.summaryGeneratedAt?.toISOString(),
        summaryTokensUsed: note.summaryTokensUsed,
        keyPoints: note.keyPoints ? JSON.parse(note.keyPoints) : [],
        hasSummary: note.hasSummary,
        tags: note.tags.map((noteTag: { tag: { id: any; name: any; color: any } }) => ({
          id: noteTag.tag.id,
          name: noteTag.tag.name,
          color: noteTag.tag.color
        }))
      };

      return NextResponse.json({
        message: 'Summary already exists',
        note: transformedNote
      });
    }

    // Check if content is sufficient for summarization
    if (!note.content || note.content.trim().length < 50) {
      return NextResponse.json({ 
        error: 'Note content is too short to summarize (minimum 50 characters required)' 
      }, { status: 400 });
    }

    console.log('Generating AI summary for note:', id);

    // Generate the summary using OpenAI
    const summaryResult = await generateSummary(note.content);

    // Update the note with the summary
    const updatedNote = await prisma.note.update({
      where: { id },
      data: {
        summary: summaryResult.summary,
        summaryGeneratedAt: new Date(),
        summaryTokensUsed: summaryResult.tokensUsed,
        keyPoints: JSON.stringify(summaryResult.keyPoints),
        hasSummary: true,
        updatedAt: new Date()
      },
      include: {
        tags: {
          include: {
            tag: true
          }
        }
      }
    });

    console.log('Summary generated successfully for note:', id);

    // Transform the response
    const transformedNote = {
      id: updatedNote.id,
      title: updatedNote.title,
      content: updatedNote.content,
      createdAt: updatedNote.createdAt.toISOString(),
      updatedAt: updatedNote.updatedAt.toISOString(),
      isProcessing: updatedNote.isProcessing,
      transcriptionJobId: updatedNote.transcriptionJobId,
      transcriptionStatus: updatedNote.transcriptionStatus,
      transcriptionS3Key: updatedNote.transcriptionS3Key,
      transcriptionConfidence: updatedNote.transcriptionConfidence,
      summary: updatedNote.summary,
      summaryGeneratedAt: updatedNote.summaryGeneratedAt?.toISOString(),
      summaryTokensUsed: updatedNote.summaryTokensUsed,
      keyPoints: updatedNote.keyPoints ? JSON.parse(updatedNote.keyPoints) : [],
      hasSummary: updatedNote.hasSummary,
      tags: updatedNote.tags.map((noteTag: { tag: { id: any; name: any; color: any } }) => ({
        id: noteTag.tag.id,
        name: noteTag.tag.name,
        color: noteTag.tag.color
      }))
    };

    return NextResponse.json({
      message: 'Summary generated successfully',
      note: transformedNote
    });

  } catch (error) {
    console.error('Error generating summary:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('OPENAI_API_KEY')) {
        return NextResponse.json({ 
          error: 'AI service is not configured. Please contact support.' 
        }, { status: 503 });
      }
      
      if (error.message.includes('rate limit') || error.message.includes('quota')) {
        return NextResponse.json({ 
          error: 'AI service is temporarily unavailable. Please try again later.' 
        }, { status: 429 });
      }
    }

    return NextResponse.json({ 
      error: 'Failed to generate summary',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 