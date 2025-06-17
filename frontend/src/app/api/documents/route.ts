import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Get the auth token from cookies
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    console.log('📥 Document upload request received');
    console.log('🔑 Token present:', !!token);
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const response = await fetch(`${BACKEND_URL}/api/documents/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
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
    // Get the auth token from cookies
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    console.log('📥 Document fetch request received');
    console.log('🔑 Token present:', !!token);
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const response = await fetch(`${BACKEND_URL}/api/documents`, {
      headers: {
        'Authorization': `Bearer ${token}`,
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

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    // Get the auth token from cookies
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    console.log('📥 Document delete request received');
    console.log('🔑 Token present:', !!token);
    console.log('📄 Document ID:', id);
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const response = await fetch(`${BACKEND_URL}/api/documents/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    console.log('📥 Backend response status:', response.status);
    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Backend error:', errorData);
      return NextResponse.json(
        { error: errorData.error || 'Failed to delete document' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Document deleted successfully');
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Document delete API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 