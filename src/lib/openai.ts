import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable is required');
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface SummaryResponse {
  summary: string;
  keyPoints: string[];
  tokensUsed: number;
}

export async function generateSummary(content: string, maxTokens: number = 150): Promise<SummaryResponse> {
  if (!content || content.trim().length < 50) {
    throw new Error('Content is too short to summarize (minimum 50 characters)');
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are an AI assistant that creates concise, helpful summaries. 
          Your task is to:
          1. Create a brief, clear summary of the main content
          2. Extract 3-5 key points as bullet points
          3. Focus on the most important information
          4. Keep the summary professional yet accessible
          
          Respond with JSON format:
          {
            "summary": "Brief summary text",
            "keyPoints": ["Key point 1", "Key point 2", "Key point 3"]
          }`
        },
        {
          role: 'user',
          content: `Please summarize this content:\n\n${content}`
        }
      ],
      max_tokens: maxTokens,
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const result = completion.choices[0]?.message?.content;
    if (!result) {
      throw new Error('No response from OpenAI');
    }

    const parsedResult = JSON.parse(result);
    const tokensUsed = completion.usage?.total_tokens || 0;

    return {
      summary: parsedResult.summary,
      keyPoints: parsedResult.keyPoints || [],
      tokensUsed
    };
  } catch (error) {
    console.error('Error generating summary:', error);
    if (error instanceof Error) {
      throw new Error(`Summary generation failed: ${error.message}`);
    }
    throw new Error('Summary generation failed');
  }
}

export async function generateSmartTitle(content: string): Promise<string> {
  if (!content || content.trim().length < 10) {
    return 'Untitled Note';
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'Generate a concise, descriptive title (max 60 characters) for the following content. Return only the title, nothing else.'
        },
        {
          role: 'user',
          content: content.substring(0, 500) // Use first 500 chars for title generation
        }
      ],
      max_tokens: 20,
      temperature: 0.3
    });

    const title = completion.choices[0]?.message?.content?.trim();
    return title && title.length > 0 ? title : 'Untitled Note';
  } catch (error) {
    console.error('Error generating title:', error);
    return 'Untitled Note';
  }
} 