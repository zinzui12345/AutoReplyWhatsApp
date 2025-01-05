const {makeWASocket, DisconnectReason, useMultiFileAuthState, Browsers} = require('@whiskeysockets/baileys');
const pino = require('pino');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

let useCode = true;
let loggedInNumber;

async function connectToWhatsApp(){
    const sessionPath = path.join(__dirname, 'sessions');
    const sessionExists = fs.existsSync(sessionPath) && fs.readdirSync(sessionPath).length > 0;
    
    const { state, saveCreds } = await useMultiFileAuthState('sessions');

    const sock = makeWASocket({
        logger: pino({ level: 'fatal' }),
        auth: state,
        printQRInTerminal: !useCode,
        defaultQueryTimeoutMs: undefined,
        keepAliveIntervalMs: 30000,
        browser: Browsers.macOS('Chrome'),
        shouldSyncHistoryMessage: () => false,
        markOnlineOnConnect: true,
        syncFullHistory: false,
        generateHighQualityLinkPreview: true
    });

    if (useCode && !sessionExists) {

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        console.log("Halo sepertinya kamu belum login, Mau login wangsaf pakai pairing code?\nSilahkan balas dengan (y/n)\nketik y untuk setuju atau ketik n untuk login menggunakan qrcode") // pesan untuk yang menggunakan panel

        const askPairingCode = () => {
            rl.question('\nApakah kamu ingin menggunakan pairing code untuk login ke wangsaf? (y/n): ', async (answer) => {
                if (answer.toLowerCase() === 'y' || answer.trim() === '') {
                    console.log("\nWokeh kalau gitu silahkan masukkan nomor wangsafmu!\ncatatan : awali dengan 62 contoh 628123456789") // pesan untuk yang menggunakan panel
                    const askWaNumber = () => {
                        rl.question('\nMasukkan nomor wangsaf Anda: ', async (waNumber) => {
                            if (!/^\d+$/.test(waNumber)) {
                                console.log('\nNomor harus berupa angka!\nSilakan masukkan nomor wangsaf kembali!.');
                                askWaNumber();
                            } else if (!waNumber.startsWith('62')) {
                                console.log('\nNomor harus diawali dengan 62!\nContoh : 628123456789\nSilakan masukkan nomor wangsaf kembali!.');
                                askWaNumber();
                            } else {
                                const code = await sock.requestPairingCode(waNumber);
                                console.log('\nCek notifikasi wangsafmu dan masukin kode login wangsaf:', code);
                                rl.close();
                            }
                        });
                    };
                    askWaNumber();
                } else if (answer.toLowerCase() === 'n') {
                    useCode = false;
                    console.log('\nBuka wangsafmu lalu klik titik tiga di kanan atas kemudian klik perangkat tertaut setelah itu Silahkan scan QR code dibawah untuk login ke wangsaf');
                    connectToWhatsApp();
                    rl.close();
                } else {
                    console.log('\nInput tidak valid. Silakan masukkan "y" atau "n".');
                    askPairingCode();
                }
            });
        };
    
        askPairingCode();
    }
    
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if(connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output.statusCode !== DisconnectReason.loggedOut;
            if(shouldReconnect) {
                console.log('Mencoba menghubungkan ke wangsaf...\n');
                connectToWhatsApp();
            } else {
                console.log('Terputus dari wangsaf, silahkan hapus folder sessions dan login ke wangsaf kembali');
            }
        } else if(connection === 'open') {
            console.log('Terhubung ke wangsaf')
            loggedInNumber = sock.user.id.split('@')[0].split(':')[0];
            console.log(`kamu berhasil login dengan nomor: ${loggedInNumber} \n`);
            console.log("Bot sudah aktif!\n\nSelamat menikmati fitur auto read story whatsapp by Jauhariel\n\nCatatan :\n1. Klik ctrl dan c pada keyboard secara bersamaan untuk memberhentikan bot!\n2. Jangan lupa untuk menghapus folder sessions jika ingin login dengan nomor lain atau terjadi masalah login seperti stuck di 'menghubungkan ke wangsaf'!\n3.Kamu bisa menambahkan nomor yang tidak ingin kamu lihat story-nya secara otomatis di file blacklist.txt.\n");
        }
    })
    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message) return;
        
        if (msg.key.remoteJid === "status@broadcast") {
            const senderNumber = msg.key.participant ? msg.key.participant.split('@')[0] : 'Tidak diketahui';
            const senderName = msg.pushName || 'Tidak diketahui';

            const blacklistPath = path.join(__dirname, 'blacklist.txt');
            const blacklist = fs.readFileSync(blacklistPath, 'utf-8').split('\n').map(num => num.trim());

            if (msg.message.protocolMessage) {
                console.log(`Status dari ${senderName} (${senderNumber}) telah dihapus.\n`);
            } else {
                if (blacklist.includes(senderNumber)) {
                    console.log(`${senderName} (${senderNumber}) membuat status tapi karena ada di blacklist. Status tidak akan dilihat.\n`);
                    return;
                }

                await sock.readMessages([msg.key]);
                console.log(`Berhasil melihat Status dari: ${senderName} (${senderNumber})\n`);

                const targetNumber = loggedInNumber;
                const messageContent = `Status dari *${senderName}* (${senderNumber}) telah dilihat.`;

                await sock.sendMessage(`${targetNumber}@s.whatsapp.net`, { text: messageContent });
            }
	}
    });
}

connectToWhatsApp();
