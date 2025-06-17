import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export async function POST(request: NextRequest) {
  try {
    console.log('Received document upload request');
    const formData = await request.formData();
    const authHeader = request.headers.get('authorization');
    console.log('Auth header present:', !!authHeader);
    
    console.log('Forwarding request to backend:', `${BACKEND_URL}/api/documents/upload`);
    const response = await fetch(`${BACKEND_URL}/api/documents/upload`, {
      method: 'POST',
      headers: {
        ...(authHeader && { 'Authorization': authHeader }),
      },
      body: formData,
    });

    console.log('Backend response status:', response.status);
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Backend error response:', errorData);
      return NextResponse.json(
        { error: errorData.error || 'Failed to upload document' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Upload successful:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Document upload API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 