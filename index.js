require('dotenv').config();
const http = require('node:http');
const { Client, GatewayIntentBits } = require('discord.js');
// ดึง VoiceConnectionStatus เข้ามาให้ครบถ้วนเพื่อใช้ดักจับสถานะ Ready 
const { joinVoiceChannel, VoiceConnectionStatus, createAudioPlayer, createAudioResource, AudioPlayerStatus, StreamType } = require('@discordjs/voice');
const { Readable } = require('node:stream');

if (!process.env.DISCORD_TOKEN || !process.env.GUILD_ID || !process.env.VOICE_CHANNEL_ID) {
    console.error('❌ ข้อผิดพลาด: ตรวจพบข้อมูลในไฟล์ .env ไม่ครบถ้วน!');
    console.error('   กรุณาตั้งค่า DISCORD_TOKEN, GUILD_ID, VOICE_CHANNEL_ID');
    console.error('   ดูวิธีตั้งค่าได้ที่ README.md ของโปรเจกต์นี้');
    process.exit(1);
}

// ==================================================
// 🌐 ส่วนรองรับการรันบน Render (Web Service)
// ==================================================
// Render ต้องการให้แอปเปิดพอร์ตรับ HTTP request ถึงจะถือว่า deploy สำเร็จ
// และฟรีแพลนจะ sleep เมื่อไม่มี traffic เข้ามานานเกินไป จึงต้องมี endpoint ให้ ping ได้

const PORT = process.env.PORT || 3000;
let botStatus = 'starting'; // starting | connected | reconnecting

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        status: 'ok',
        bot: botStatus,
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
    }));
});

server.listen(PORT, () => {
    console.log(`🌐 HTTP server สำหรับ Render กำลังฟังที่พอร์ต ${PORT}`);
});

// ==================================================
// 🔄 Self-ping กันไม่ให้ Render สั่ง sleep
// ==================================================
// ตั้งค่า RENDER_EXTERNAL_URL หรือ PING_URL ใน environment variable
// (Render จะกำหนด RENDER_EXTERNAL_URL ให้อัตโนมัติอยู่แล้วสำหรับ Web Service)

const PING_URL = process.env.PING_URL || process.env.RENDER_EXTERNAL_URL;
const PING_INTERVAL_MS = Number(process.env.PING_INTERVAL_MS) || 4 * 60 * 1000; // ทุก 4 นาที

function selfPing() {
    if (!PING_URL) return;

    const url = new URL(PING_URL);
    const pingClient = url.protocol === 'https:' ? require('node:https') : http;

    pingClient.get(url, (res) => {
        console.log(`📡 Self-ping สำเร็จ (${res.statusCode}) → ${PING_URL}`);
        res.resume();
    }).on('error', (err) => {
        console.error('⚠️ Self-ping ล้มเหลว:', err.message);
    });
}

if (PING_URL) {
    console.log(`🔁 ตั้งค่า Self-ping ทุก ${PING_INTERVAL_MS / 1000} วินาที ไปยัง ${PING_URL}`);
    setInterval(selfPing, PING_INTERVAL_MS);
} else {
    console.log('ℹ️ ไม่ได้ตั้งค่า PING_URL / RENDER_EXTERNAL_URL — ข้ามการทำ self-ping (ปกติถ้ารันแบบ Background Worker)');
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildVoiceStates
    ]
});

// แพ็กเก็ตเสียงเงียบ (Static Buffer)
const SILENCE_PACKET = Buffer.from([0xF8, 0xFF, 0xFE]);

function createSilenceStream() {
    return new Readable({
        highWaterMark: 1, 
        read() {
            this.push(SILENCE_PACKET);
        }
    });
}

function connectToVoice() {
    const guild = client.guilds.cache.get(process.env.GUILD_ID);
    if (!guild) return console.log("❌ ไม่พบเซิร์ฟเวอร์ที่ระบุในระบบ");

    const channel = guild.channels.cache.get(process.env.VOICE_CHANNEL_ID);
    if (!channel) return console.log("❌ ไม่พบห้องเสียงที่ระบุในระบบ");

    console.log(`⏳ [Node.js ${process.version}] กำลังเชื่อมต่อไปยังห้องเสียง: ${channel.name}...`);

    const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: guild.id,
        adapterCreator: guild.voiceAdapterCreator,
        selfMute: false, 
        selfDeaf: true,  
    });

    const player = createAudioPlayer();
    
    const playSilence = () => {
        const resource = createAudioResource(createSilenceStream(), { 
            inputType: StreamType.Raw 
        });
        player.play(resource);
    };

    player.on(AudioPlayerStatus.Idle, () => {
        setTimeout(playSilence, 1);
    });
    
    connection.subscribe(player);
    
    // รันเริ่มส่งสัญญาณเสียงเงียบ
    playSilence(); 

    // บังคับให้ Console พิมพ์บอกทันทีหลังจากระบบเริ่มกระบวนการสตรีมเงียบสำเร็จ
    console.log(`🟢 [Voice] บอทเข้าสิงห้องเสียง "${channel.name}" และเริ่มส่งสัญญาณ 24/7 สำเร็จแล้ว!`);
    botStatus = 'connected';

    connection.on(VoiceConnectionStatus.Disconnected, () => {
        console.log('⚠️ ตรวจพบสัญญาณขาดหาย! กำลังดำเนินการต่อเข้าห้องใหม่ใน 3 วินาที...');
        botStatus = 'reconnecting';
        connection.destroy();
        setTimeout(connectToVoice, 3000);
    });
}

client.once('clientReady', () => {
    console.log(`✅ บอท ${client.user.tag} ทำงานแบบ 24/7 บนสแต็กเวอร์ชันล่าสุดเรียบร้อยแล้ว!`);
    connectToVoice();
});

// ดักจับและคัดกรอง Error ระดับ Global
process.on('unhandledRejection', error => {
    if (error.message && error.message.includes('Node type')) return;
    console.error('⚠️ Global Unhandled Rejection:', error);
});

process.on('uncaughtException', error => {
    console.error('⚠️ Global Uncaught Exception:', error);
});

client.login(process.env.DISCORD_TOKEN);
