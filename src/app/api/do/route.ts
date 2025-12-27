import { NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { token, endpoint, method, data } = body;

    if (!token) {
      return NextResponse.json({ error: 'Token Missing' }, { status: 401 });
    }

    // Config Axios ke DigitalOcean
    const config = {
      method: method || 'GET',
      url: `https://api.digitalocean.com/v2${endpoint}`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: data || {},
    };

    const response = await axios(config);
    return NextResponse.json(response.data);

  } catch (error: any) {
    console.error("DO API Error:", error.response?.data || error.message);
    return NextResponse.json(
      { error: error.response?.data?.message || 'Terjadi Kesalahan API DO' },
      { status: error.response?.status || 500 }
    );
  }
}
