const { makeWASocket, DisconnectReason, useMultiFileAuthState, Browsers, jidNormalizedUser, downloadMediaMessage} = require('@whiskeysockets/baileys');
const pino = require('pino');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

let useCode = true;
let loggedInNumber;

const configPath = path.join(__dirname, 'config.json');
let config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

let { autoLikeStatus, downloadMediaStatus, sensorNomor, antiTelpon, blackList, whiteList, emojis } = config;

const updateConfig = (key, value) => {
    config[key] = value;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 4), 'utf-8');
};

let welcomeMessage = false;

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
        shouldSyncHistoryMessage: () => true,
        markOnlineOnConnect: true,
        syncFullHistory: true,
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
    
    sock.ev.on('connection.update', async (update) => {
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
            let displayedLoggedInNumber = loggedInNumber;
            if (sensorNomor) {
                displayedLoggedInNumber = displayedLoggedInNumber.slice(0, 3) + '****' + displayedLoggedInNumber.slice(-2);
            }
            let messageInfo = `Bot *AutoReadStoryWhatsApp* Aktif!
Kamu berhasil login dengan nomor: ${displayedLoggedInNumber}

info status fitur:
- Auto Like Status: ${autoLikeStatus ? "*Aktif*" : "*Nonaktif*"}
- Download Media Status: ${downloadMediaStatus ? "*Aktif*" : "*Nonaktif*"}
- Sensor Nomor: ${sensorNomor ? "*Aktif*" : "*Nonaktif*"}
- Anti Telpon: ${antiTelpon ? "*Aktif*" : "*Nonaktif*"}

Ketik *#menu* untuk melihat menu perintah yang tersedia.

SC : https://github.com/jauhariel/AutoReadStoryWhatsapp`;
            console.log(`kamu berhasil login dengan nomor: ${displayedLoggedInNumber} \n`);
            console.log("Bot sudah aktif!\n\nSelamat menikmati fitur auto read story whatsapp by github.com/Jauhariel\n");

            if (!welcomeMessage) {
                setTimeout(async () => {
                    await sock.sendMessage(`${loggedInNumber}@s.whatsapp.net`, { text: messageInfo });
                    welcomeMessage = true;
                }, 5000);
            }
        }
    })
    sock.ev.on('creds.update', saveCreds);

    sock.ev.on("call", (call) => {
        const { id, status, from } = call[0];
        if (status === "offer" && antiTelpon)
          return sock.rejectCall(id, from);
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message) return;

        msg.type = msg.message.imageMessage ? "imageMessage" : msg.message.videoMessage ? "videoMessage" : msg.message.audioMessage ? "audioMessage" : Object.keys(msg.message)[0];

        msg.text = msg.type == "conversation" ? msg.message.conversation : "";

        const prefixes = [".", "#", "!", "/"];
        let prefix = prefixes.find(p => msg.text.startsWith(p));

        if (prefix) {
            msg.cmd = msg.text.trim().split(" ")[0].replace(prefix, "").toLowerCase();
        
            // args
            msg.args = msg.text.replace(/^\S*\b/g, "").trim().split("|");
        
            // command
            switch (msg.cmd) {
                case "on":
                    msg.args[0].trim() === ""
                        ? await sock.sendMessage(`${loggedInNumber}@s.whatsapp.net`, { text: `mana argumennya ?\ncontoh ketik : \`#on autolike\`\n\nArgumen yang tersedia:\n\n\`#on autolike\`\nuntuk mengaktifkan fitur autolike\n\n\`#on dlmedia\`\nuntuk mengaktifkan fitur download media(foto,video, dan audio) dari story\n\n\`#on sensornomor\`\nuntuk mengaktifkan sensor nomor\n\n\`#on antitelpon\`\nuntuk mengaktifkan anti-telpon` }, { quoted: msg })
                        : msg.args.forEach(async arg => {
                            switch (arg.trim().toLowerCase()) {
                                case "autolike":
                                    autoLikeStatus = true;
                                    updateConfig('autoLikeStatus', true);
                                    await sock.sendMessage(`${loggedInNumber}@s.whatsapp.net`, { text: "Auto Like Status aktif" }, { quoted: msg });
                                    break;
                                case "dlmedia":
                                    downloadMediaStatus = true;
                                    updateConfig('downloadMediaStatus', true);
                                    await sock.sendMessage(`${loggedInNumber}@s.whatsapp.net`, { text: "Download Media Status aktif" }, { quoted: msg });
                                    break;
                                case "sensornomor":
                                    sensorNomor = true;
                                    updateConfig('sensorNomor', true);
                                    await sock.sendMessage(`${loggedInNumber}@s.whatsapp.net`, { text: "Sensor Nomor aktif" }, { quoted: msg });
                                    break;
                                case "antitelpon":
                                    antiTelpon = true;
                                    updateConfig('antiTelpon', true);
                                    await sock.sendMessage(`${loggedInNumber}@s.whatsapp.net`, { text: "Anti-telpon aktif" }, { quoted: msg });
                                    break;
                                default:
                                    await sock.sendMessage(`${loggedInNumber}@s.whatsapp.net`, { text: `Argumen tidak valid: ${arg}. Pilihan yang tersedia: autolike, dlmedia, sensornomor, dan antitelpon` }, { quoted: msg });
                                    break;
                            }
                        });
                    break;
                case "off":
                    msg.args[0].trim() === ""
                        ? await sock.sendMessage(`${loggedInNumber}@s.whatsapp.net`, { text: `mana argumennya ?\ncontoh ketik : \`#off autolike\`\n\nArgumen yang tersedia:\n\n\`#off autolike\`\nuntuk menonaktifkan fitur autolike\n\n\`#off dlmedia\`\nuntuk menonaktifkan fitur download media(foto,video, dan audio) dari story\n\n\`#off sensornomor\`\nuntuk menonaktifkan sensor nomor\n\n\`#off antitelpon\`\nuntuk menonaktifkan anti-telpon` }, { quoted: msg })
                        : msg.args.forEach(async arg => {
                            switch (arg.trim().toLowerCase()) {
                                case "autolike":
                                    autoLikeStatus = false;
                                    updateConfig('autoLikeStatus', false);
                                    await sock.sendMessage(`${loggedInNumber}@s.whatsapp.net`, { text: "Auto Like Status nonaktif" }, { quoted: msg });
                                    break;
                                case "dlmedia":
                                    downloadMediaStatus = false;
                                    updateConfig('downloadMediaStatus', false);
                                    await sock.sendMessage(`${loggedInNumber}@s.whatsapp.net`, { text: "Download Media Status nonaktif" }, { quoted: msg });
                                    break;
                                case "sensornomor":
                                    sensorNomor = false;
                                    updateConfig('sensorNomor', false);
                                    await sock.sendMessage(`${loggedInNumber}@s.whatsapp.net`, { text: "Sensor Nomor nonaktif" }, { quoted: msg });
                                    break;
                                case "antitelpon":
                                    antiTelpon = false;
                                    updateConfig('antiTelpon', false);
                                    await sock.sendMessage(`${loggedInNumber}@s.whatsapp.net`, { text: "Anti-telpon nonaktif" }, { quoted: msg });
                                    break;
                                default:
                                    await sock.sendMessage(`${loggedInNumber}@s.whatsapp.net`, { text: `Argumen tidak valid: ${arg}. Pilihan yang tersedia: autolike, dlmedia, sensornomor, dan antitelpon` }, { quoted: msg });
                                    break;
                            }
                        });
                    break;
                case "add":
                    msg.args[0].trim() === ""
                        ? await sock.sendMessage(`${loggedInNumber}@s.whatsapp.net`, { text: `mana argumennya ?\ncontoh ketik :\n\`#add blacklist 628123456789\`\n\nArgumen yang tersedia:\n\n\`#add blacklist nomornya\`\nuntuk menambahkan nomor ke blacklist\n\n\`#add whitelist nomornya\`\nuntuk menambahkan nomor ke whitelist` }, { quoted: msg })
                        : msg.args.forEach(async arg => {
                            const [list, number] = arg.trim().split(" ");
                            if (!/^\d+$/.test(number)) {
                                await sock.sendMessage(`${loggedInNumber}@s.whatsapp.net`, { text: `Nomor harus diisi dan berupa angka.` }, { quoted: msg });
                                return;
                            }
                            if (!number.startsWith('62')) {
                                await sock.sendMessage(`${loggedInNumber}@s.whatsapp.net`, { text: `Nomor harus diawali dengan 62.` }, { quoted: msg });
                                return;
                            }
                            if (list === "blacklist") {
                                if (!blackList.includes(number)) {
                                    blackList.push(number);
                                    updateConfig('blackList', blackList);
                                    await sock.sendMessage(`${loggedInNumber}@s.whatsapp.net`, { text: `Nomor ${number} berhasil ditambahkan ke blacklist` }, { quoted: msg });
                                } else {
                                    await sock.sendMessage(`${loggedInNumber}@s.whatsapp.net`, { text: `Nomor ${number} sudah ada di blacklist` }, { quoted: msg });
                                }
                            } else if (list === "whitelist") {
                                if (!whiteList.includes(number)) {
                                    whiteList.push(number);
                                    updateConfig('whiteList', whiteList);
                                    await sock.sendMessage(`${loggedInNumber}@s.whatsapp.net`, { text: `Nomor ${number} berhasil ditambahkan ke whitelist` }, { quoted: msg });
                                } else {
                                    await sock.sendMessage(`${loggedInNumber}@s.whatsapp.net`, { text: `Nomor ${number} sudah ada di whitelist` }, { quoted: msg });
                                }
                            } else {
                                await sock.sendMessage(`${loggedInNumber}@s.whatsapp.net`, { text: `Argumen tidak valid: ${arg}. Pilihan yang tersedia: blacklist, whitelist` }, { quoted: msg });
                            }
                        });
                    break;
                case "remove":
                    msg.args[0].trim() === ""
                        ? await sock.sendMessage(`${loggedInNumber}@s.whatsapp.net`, { text: `mana argumennya ?\ncontoh ketik :\n\`#remove blacklist 628123456789\`\n\nArgumen yang tersedia:\n\n\`#remove blacklist nomornya\`\nuntuk menghapus nomor dari blacklist\n\n\`#remove whitelist nomornya\`\nuntuk menghapus nomor dari whitelist` }, { quoted: msg })
                        : msg.args.forEach(async arg => {
                            const [list, number] = arg.trim().split(" ");
                            if (!/^\d+$/.test(number)) {
                                await sock.sendMessage(`${loggedInNumber}@s.whatsapp.net`, { text: `Nomor harus diisi dan berupa angka.` }, { quoted: msg });
                                return;
                            }
                            if (!number.startsWith('62')) {
                                await sock.sendMessage(`${loggedInNumber}@s.whatsapp.net`, { text: `Nomor harus diawali dengan 62.` }, { quoted: msg });
                                return;
                            }
                            if (list === "blacklist") {
                                if (blackList.includes(number)) {
                                    blackList = blackList.filter(n => n !== number);
                                    updateConfig('blackList', blackList);
                                    await sock.sendMessage(`${loggedInNumber}@s.whatsapp.net`, { text: `Nomor ${number} berhasil dihapus dari blacklist` }, { quoted: msg });
                                } else {
                                    await sock.sendMessage(`${loggedInNumber}@s.whatsapp.net`, { text: `Nomor tidak ada di blacklist\n\nKetik \`#listnomor\` untuk mengecek daftar nomor yang tersedia` }, { quoted: msg });
                                }
                            } else if (list === "whitelist") {
                                if (whiteList.includes(number)) {
                                    whiteList = whiteList.filter(n => n !== number);
                                    updateConfig('whiteList', whiteList);
                                    await sock.sendMessage(`${loggedInNumber}@s.whatsapp.net`, { text: `Nomor ${number} berhasil dihapus dari whitelist` }, { quoted: msg });
                                } else {
                                    await sock.sendMessage(`${loggedInNumber}@s.whatsapp.net`, { text: `Nomor tidak ada di whitelist\n\nKetik \`#listnomor\` untuk mengecek daftar nomor yang tersedia` }, { quoted: msg });
                                }
                            } else {
                                await sock.sendMessage(`${loggedInNumber}@s.whatsapp.net`, { text: `Argumen tidak valid: ${arg}. Pilihan yang tersedia: blacklist, whitelist` }, { quoted: msg });
                            }
                        });
                    break;
                case "listnomor":
                    const blacklistMessage = blackList.length > 0 ? `Blacklist:\n${blackList.join('\n')}` : "Blacklist kosong.";
                    const whitelistMessage = whiteList.length > 0 ? `Whitelist:\n${whiteList.join('\n')}` : "Whitelist kosong.";
                    const listMessage = `${blacklistMessage}\n\n${whitelistMessage}\n\nKetik \`#add\` untuk menambahkan nomor ke blacklist atau whitelist\nKetik \`#remove\` untuk menghapus nomor dari blacklist atau whitelist`;
                    await sock.sendMessage(`${loggedInNumber}@s.whatsapp.net`, { text: listMessage }, { quoted: msg });
                    break;
                case "menu":
                    const menuMessage = `Daftar Menu:
contoh penggunaan: #on autolike

Perintah On:
\`#on autolike\`
Mengaktifkan fitur autolike

\`#on dlmedia\`
Mengaktifkan fitur download media (foto, video, dan audio) dari story

\`#on sensornomor\`
Mengaktifkan sensor nomor

\`#on antitelpon\`
Mengaktifkan anti telpon

Perintah Off:
\`#off autolike\`
Menonaktifkan fitur autolike

\`#off dlmedia\`
Menonaktifkan fitur download media (foto, video, dan audio) dari story

\`#off sensornomor\`
Menonaktifkan sensor nomor

\`#off antitelpon\`
Menonaktifkan anti telpon

Perintah Add:
\`#add blacklist nomornya\`
Menambahkan nomor ke blacklist

\`#add whitelist nomornya\`
Menambahkan nomor ke whitelist

Perintah Remove:
\`#remove blacklist nomornya\`
Menghapus nomor dari blacklist

\`#remove whitelist nomornya\`
Menghapus nomor dari whitelist

Perintah Info:
\`#info\`
Menampilkan informasi status fitur
\`#listnomor\`
Menampilkan daftar nomor di blacklist dan whitelist`;

                    await sock.sendMessage(`${loggedInNumber}@s.whatsapp.net`, { text: menuMessage }, { quoted: msg });
                    break;
                case "info":
                    const infoMessage = `Informasi Status Fitur:
- Auto Like Status: ${autoLikeStatus ? "*Aktif*" : "*Nonaktif*"}
- Download Media Status: ${downloadMediaStatus ? "*Aktif*" : "*Nonaktif*"}
- Sensor Nomor: ${sensorNomor ? "*Aktif*" : "*Nonaktif*"}
- Anti Telpon: ${antiTelpon ? "*Aktif*" : "*Nonaktif*"}`;

                    await sock.sendMessage(`${loggedInNumber}@s.whatsapp.net`, { text: infoMessage }, { quoted: msg });
                    break;
            }
        }

        // status
        if (msg.key.remoteJid === "status@broadcast" && msg.key.participant !== `${loggedInNumber}@s.whatsapp.net`) {
            let senderNumber = msg.key.participant ? msg.key.participant.split('@')[0] : 'Tidak diketahui';
            let displaySendernumber = senderNumber;
            const senderName = msg.pushName || 'Tidak diketahui';

            if (sensorNomor && displaySendernumber !== 'Tidak diketahui') {
                displaySendernumber = displaySendernumber.slice(0, 3) + '****' + displaySendernumber.slice(-2);
            }

            if (msg.message.protocolMessage) {
                console.log(`Status dari ${senderName} (${displaySendernumber}) telah dihapus.\n`);
            } else if (!msg.message.reactionMessage) {
                if (blackList.includes(senderNumber)) {
                    console.log(`${senderName} (${displaySendernumber}) membuat status tapi karena ada di blacklist. Status tidak akan dilihat.\n`);
                    return;
                }

                if (whiteList.length > 0 && !whiteList.includes(senderNumber)) {
                    console.log(`${senderName} (${displaySendernumber}) membuat status tapi karena tidak ada di whitelist. Status tidak akan dilihat.\n`);
                    return;
                }

                const myself = jidNormalizedUser(sock.user.id);
                const emojiToReact = emojis[Math.floor(Math.random() * emojis.length)];

                if (msg.key.remoteJid && msg.key.participant) {
                    await sock.readMessages([msg.key]);

                    if (autoLikeStatus) {
                        await sock.sendMessage(
                            msg.key.remoteJid,
                            { react: { key: msg.key, text: emojiToReact } },
                            { statusJidList: [msg.key.participant, myself] }
                        );
                    }

                    console.log(`Berhasil melihat ${autoLikeStatus ? "dan menyukai " : ""}status dari: ${senderName} (${displaySendernumber})\n`);

                    const targetNumber = loggedInNumber;
                    let messageContent = `Status dari *${senderName}* (${displaySendernumber}) telah dilihat ${autoLikeStatus ? "dan disukai" : ""}`;
                    let caption = msg.message.imageMessage?.caption || msg.message.videoMessage?.caption || msg.message.extendedTextMessage?.text || "Tidak ada caption";

                    if (downloadMediaStatus) {
                        if (msg.type === "imageMessage" || msg.type === "videoMessage") {
                            let mediaType = msg.type === "imageMessage" ? "image" : "video";
                            messageContent = `Status ${mediaType === "image" ? "gambar" : "video"} dari *${senderName}* (${displaySendernumber}) telah dilihat ${autoLikeStatus ? "dan disukai" : ""}`;
                        
                            try {
                                const buffer = await downloadMediaMessage(msg, "buffer", {}, {
                                    logger: pino({ level: 'fatal' }),
                                });
                        
                                await sock.sendMessage(`${targetNumber}@s.whatsapp.net`, { 
                                    [mediaType]: Buffer.from(buffer),
                                    caption: `${messageContent} dengan caption : "*${caption}*"` 
                                });
                            } catch (error) {
                                console.error('Error uploading media:', error);
                                await sock.sendMessage(`${targetNumber}@s.whatsapp.net`, { text: `${messageContent} namun Gagal mengunggah media dari status ${mediaType === "image" ? "gambar" : "video"} dari *${senderName}* (${displaySendernumber}).` });
                            }
                        } else if (msg.type === "audioMessage") {
                            messageContent = `Status audio dari *${senderName}* (${displaySendernumber}) telah dilihat ${autoLikeStatus ? "dan disukai" : ""}. Berikut audionya.`;
    
                            await sock.sendMessage(`${targetNumber}@s.whatsapp.net`, { text: messageContent });
    
                            try {
                                const buffer = await downloadMediaMessage(msg, "buffer", {}, {
                                    logger: pino({ level: 'fatal' }),
                                });
                    
                                await sock.sendMessage(`${targetNumber}@s.whatsapp.net`, { 
                                    audio: Buffer.from(buffer),
                                    caption: "" 
                                });
                            } catch (error) {
                                console.error('Error uploading audio:', error);
                                await sock.sendMessage(`${targetNumber}@s.whatsapp.net`, { text: `Gagal mengunggah audio dari status audio dari *${senderName}* (${displaySendernumber}).` });
                            }
                        } else {
                            messageContent = `Status teks dari *${senderName}* (${displaySendernumber}) telah dilihat ${autoLikeStatus ? "dan disukai" : ""} dengan caption: "*${caption}*"`;
    
                            await sock.sendMessage(`${targetNumber}@s.whatsapp.net`, { text: messageContent });
                        }
                    } else {
                        await sock.sendMessage(`${targetNumber}@s.whatsapp.net`, { text: messageContent });
                    }
                }
            } 
	}
    });
}

connectToWhatsApp();