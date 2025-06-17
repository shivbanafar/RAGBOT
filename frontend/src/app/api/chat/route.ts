import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('\n=== Frontend API Route ===');
    console.log('📥 Message received from frontend:', {
      content: body.content,
      role: body.role,
      chatId: body.chatId,
      timestamp: new Date().toISOString()
    });
    
    // Get the auth token from the request headers
    const authHeader = request.headers.get('authorization');
    console.log('🔑 Auth header present:', !!authHeader);

    // Determine if this is a chat creation or message request
    const isChatCreation = !body.chatId;
    let endpoint = isChatCreation ? '/api/chat' : '/api/chat/message';
    
    // If it's a user message, we need to process it
    if (!isChatCreation && body.role === 'user') {
      // First, add the user message
      console.log('📤 Adding user message to chat');
      const messageResponse = await fetch(`${BACKEND_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader && { 'Authorization': authHeader }),
        },
        body: JSON.stringify(body),
      });

      if (!messageResponse.ok) {
        const errorData = await messageResponse.json();
        console.error('❌ Failed to add message:', errorData);
        return NextResponse.json(
          { error: errorData.error || 'Failed to add message' },
          { status: messageResponse.status }
        );
      }

      // Then, process the message to get AI response
      console.log('📤 Processing message for AI response');
      endpoint = `/api/chat/${body.chatId}/process`;
      const processResponse = await fetch(`${BACKEND_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader && { 'Authorization': authHeader }),
        },
        body: JSON.stringify({ message: body.content }),
      });

      if (!processResponse.ok) {
        const errorData = await processResponse.json();
        console.error('❌ Failed to process message:', errorData);
        return NextResponse.json(
          { error: errorData.error || 'Failed to process message' },
          { status: processResponse.status }
        );
      }

      const data = await processResponse.json();
      console.log('✅ AI response received:', {
        messageCount: data.messages?.length || 0,
        lastMessage: data.messages?.[data.messages.length - 1] || null,
        timestamp: new Date().toISOString()
      });
      return NextResponse.json(data);
    }

    // For chat creation or non-user messages, just forward the request
    console.log(`📤 Forwarding request to ${endpoint}`);
    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { 'Authorization': authHeader }),
      },
      body: JSON.stringify(body),
    });

    console.log('📥 Backend response status:', response.status);

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
        console.error('❌ Backend error response:', errorData);
      } catch {
        errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
      }
      return NextResponse.json(
        { error: errorData.error || 'Failed to process request' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Backend response data:', {
      messageCount: data.messages?.length || 0,
      lastMessage: data.messages?.[data.messages.length - 1] || null,
      timestamp: new Date().toISOString()
    });
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 