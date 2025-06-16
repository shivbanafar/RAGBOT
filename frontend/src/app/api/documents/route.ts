import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Get the auth token from the request headers
    const authHeader = request.headers.get('authorization');
    console.log('📥 Document upload request received');
    console.log('🔑 Auth header present:', !!authHeader);
    
    const response = await fetch(`${BACKEND_URL}/api/documents/upload`, {
      method: 'POST',
      headers: {
        ...(authHeader && { 'Authorization': authHeader }),
      },
      body: formData,
    });

    console.log('📥 Backend response status:', response.status);
    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Backend error:', errorData);
      return NextResponse.json(
        { error: errorData.error || 'Failed to upload document' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Upload successful:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Document upload API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get the auth token from the request headers
    const authHeader = request.headers.get('authorization');
    console.log('📥 Document fetch request received');
    console.log('🔑 Auth header present:', !!authHeader);
    
    const response = await fetch(`${BACKEND_URL}/api/documents`, {
      headers: {
        ...(authHeader && { 'Authorization': authHeader }),
      },
    });

    console.log('📥 Backend response status:', response.status);
    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Backend error:', errorData);
      return NextResponse.json(
        { error: errorData.error || 'Failed to fetch documents' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Documents fetched successfully:', {
      count: data.length,
      documents: data.map((doc: any) => ({
        id: doc._id,
        title: doc.title,
        type: doc.type,
        createdAt: doc.createdAt
      }))
    });
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Document fetch API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 