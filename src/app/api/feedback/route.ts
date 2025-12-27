import { NextResponse } from 'next/server';
import axios from 'axios';

const BOT_TOKEN = '8172638185:AAFjHjlKb-ezRDwdp0PPe5pz9TJw-lzom8Y'; // Token Bot Lu
const CHAT_ID = '6304082972'; // ID Chat Lu

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message, sender } = body;

    if (!message) {
      return NextResponse.json({ error: 'Pesan kosong' }, { status: 400 });
    }

    // Format Pesan biar rapi di Telegram
    const text = `
📩 *SARAN / MASUKAN BARU*
---------------------------
👤 *Dari:* ${sender || 'Anonim'}
📝 *Pesan:*
${message}
---------------------------
🚀 *Kyxzan Controller*
`;

    // Kirim ke Telegram API
    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: CHAT_ID,
      text: text,
      parse_mode: 'Markdown'
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Telegram Error:", error);
    return NextResponse.json({ error: 'Gagal kirim ke Telegram' }, { status: 500 });
  }
}
