const { makeWASocket, DisconnectReason, useMultiFileAuthState, Browsers, jidNormalizedUser, downloadMediaMessage} = require('@whiskeysockets/baileys');
const pino = require('pino');
const readline = require('readline');
const https = require('https');
const fs = require('fs');
const path = require('path');
const colors = require('colors');
const moment = require('moment-timezone');
const { hostname } = require('os');
const { error } = require('console');
const stickerURL = "https://cdn.glitch.com/15e03e71-102f-4056-a602-fd237811c6aa/";
const stickers = [
    ["18", true],
    ["19", false],
    ["20", true],
    ["21", false],
    ["22", false],
    ["23", false],
    ["24", false],
    ["25", true],
    ["26", false],
    ["27", false],
    ["28", false],
    ["29", false],
    ["30", false],
    ["31", false],
    ["32", false],
    ["33", false],
    ["34", false],
    ["35", false],
    ["36", false],
    ["37", true],
    ["38", false],
    ["39", false],
    ["40", false],
    ["41", false],
    ["42", true],
    ["43", true],
    ["44", false],
    ["45", true],
    ["46", false],
    ["47", false],
    ["48", false],
    ["49", true],
    ["50", false],
    ["51", false],
    ["52", false],
    ["53", false],
    ["54", false],
    ["55", false],
    ["56", false],
    ["57", false],
    ["58", true]
];

let useCode = true;
let loggedInNumber;
let daftar_percakapan = {};
let jumlah_percakapan = 0;
let batas_percakapan = 1200;

function logCuy(message, type = 'green') {
    moment.locale('id');
    const now = moment().tz('Asia/Makassar');
    console.log(`\n${now.format(' dddd ').bgRed}${now.format(' D MMMM YYYY ').bgYellow.black}${now.format(' HH:mm:ss ').bgWhite.black}\n`);
    console.log(`${message.bold[type]}`);
}
function dapatkanDataAcakDariArray(arr) {
  if (!arr || arr.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * arr.length);
  return arr[randomIndex];
}

const configPath = path.join(__dirname, 'config.json');
let config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

let { autoLikeStatus, downloadMediaStatus, sensorNomor, antiTelpon, blackList, whiteList, emojis, groupList, geminiApiKey } = config;

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
        logger: pino({ level: 'silent' }),
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

        logCuy('Halo sepertinya kamu belum login, Mau login wangsaf pakai pairing code?\nSilahkan balas dengan (y/n)\nketik y untuk setuju atau ketik n untuk login menggunakan qrcode', 'cyan'); // pesan untuk yang menggunakan panel

        const askPairingCode = () => {
            rl.question('\nApakah kamu ingin menggunakan pairing code untuk login ke wangsaf? (y/n): '.yellow.bold, async (answer) => {
                if (answer.toLowerCase() === 'y' || answer.trim() === '') {
                    logCuy('Wokeh kalau gitu silahkan masukkan nomor wangsafmu!\ncatatan : awali dengan 62 contoh 628123456789', 'cyan'); // pesan untuk yang menggunakan panel
                    const askWaNumber = () => {
                        rl.question('\nMasukkan nomor wangsaf Anda: '.yellow.bold, async (waNumber) => {
                            if (!/^\d+$/.test(waNumber)) {
                                logCuy('Nomor harus berupa angka!\nSilakan masukkan nomor wangsaf kembali!.', 'red');
                                askWaNumber();
                            } else if (!waNumber.startsWith('62')) {
                                logCuy('Nomor harus diawali dengan 62!\nContoh : 628123456789\nSilakan masukkan nomor wangsaf kembali!.', 'red');
                                askWaNumber();
                            } else {
                                const code = await sock.requestPairingCode(waNumber);
                                console.log('\nCek notifikasi wangsafmu dan masukin kode login wangsaf:'.blue.bold, code.bold.red);
                                rl.close();
                            }
                        });
                    };
                    askWaNumber();
                } else if (answer.toLowerCase() === 'n') {
                    useCode = false;
                    logCuy('Buka wangsafmu lalu klik titik tiga di kanan atas kemudian klik perangkat tertaut setelah itu Silahkan scan QR code dibawah untuk login ke wangsaf', 'cyan');
                    connectToWhatsApp();
                    rl.close();
                } else {
                    logCuy('Input tidak valid. Silakan masukkan "y" atau "n".', 'red');
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
                logCuy('Mencoba menghubungkan ke wangsaf...\n', 'cyan');
                connectToWhatsApp();
            } else {
                logCuy('Nampaknya kamu telah logout dari wangsaf, silahkan login ke wangsaf kembali!', 'red');
                fs.rmdirSync(sessionPath, { recursive: true, force: true });
                connectToWhatsApp();
            }
        } else if(connection === 'open') {
            logCuy('Berhasil Terhubung ke wangsaf');
            loggedInNumber = sock.user.id.split('@')[0].split(':')[0];
            let displayedLoggedInNumber = loggedInNumber;
            if (sensorNomor) {
                displayedLoggedInNumber = displayedLoggedInNumber.slice(0, 3) + '****' + displayedLoggedInNumber.slice(-2);
            }
            let messageInfo =   `Bot *AutoReadStoryWhatsApp* Aktif!\n`+
                                `Kamu berhasil login dengan nomor: ${displayedLoggedInNumber}\n\n`+
                                `info status fitur:\n`+
                                `- Auto Like Status: ${autoLikeStatus ? "*Aktif*" : "*Nonaktif*"}\n`+
                                `- Download Media Status: ${downloadMediaStatus ? "*Aktif*" : "*Nonaktif*"}\n`+
                                `- Sensor Nomor: ${sensorNomor ? "*Aktif*" : "*Nonaktif*"}\n`+
                                `- Anti Telpon: ${antiTelpon ? "*Aktif*" : "*Nonaktif*"}\n\n`+
                                `Ketik *#menu* untuk melihat menu perintah yang tersedia.\n\n`+
                                `SC : https://github.com/jauhariel/AutoReadStoryWhatsapp`;
            console.log(`kamu berhasil login dengan nomor:`.green.bold, displayedLoggedInNumber.yellow.bold);
            console.log("Bot sudah aktif!\n\nSelamat menikmati fitur auto read story whatsapp by".green.bold, "github.com/Jauhariel\n".red.bold);

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

        msg.type = msg.message.imageMessage
            ? "imageMessage"
            : msg.message.videoMessage
            ? "videoMessage"
            : msg.message.audioMessage
            ? "audioMessage"
            : msg.message.extendedTextMessage
            ? "extendedTextMessage"
            : Object.keys(msg.message)[0];
        
        msg.text =
            msg.type === "conversation"
                ? msg.message.conversation
                : msg.type === "extendedTextMessage"
                ? msg.message.extendedTextMessage.text
                : msg.message[msg.type]?.caption || "";

        const prefixes = [".", "#", "!", "/"];
        let prefix = prefixes.find(p => msg.text.startsWith(p));

        if (prefix && msg.key.fromMe) {
            msg.cmd = msg.text.trim().split(" ")[0].replace(prefix, "").toLowerCase();
        
            // args
            msg.args = msg.text.replace(/^\S*\b/g, "").trim().split("|");

            async function validateNumber(commandname, type, sc, data) {
                if (!data) {
                    await sock.sendMessage(`${loggedInNumber}@s.whatsapp.net`, { text: `Nomor harus diisi.\ncontoh ketik :\n\`${commandname} blacklist 628123456789\`\n\nArgumen yang tersedia:\n\n\`${commandname} blacklist nomornya\`\nuntuk ${type} nomor ${sc} blacklist\n\n\`${commandname} whitelist nomornya\`\nuntuk ${type} nomor ${sc} whitelist` }, { quoted: msg });
                    return false;
                }
                if (!/^\d+$/.test(data)) {
                    await sock.sendMessage(`${loggedInNumber}@s.whatsapp.net`, { text: `Nomor harus berupa angka.\ncontoh ketik :\n\`${commandname} blacklist 628123456789\`\n\nArgumen yang tersedia:\n\n\`${commandname} blacklist nomornya\`\nuntuk ${type} nomor ${sc} blacklist\n\n\`${commandname} whitelist nomornya\`\nuntuk ${type} nomor ${sc} whitelist` }, { quoted: msg });
                    return false;
                }
                if (!data.startsWith('62')) {
                    await sock.sendMessage(`${loggedInNumber}@s.whatsapp.net`, { text: `Nomor harus diawali dengan 62.\ncontoh ketik :\n\`${commandname} blacklist 628123456789\`\n\nArgumen yang tersedia:\n\n\`${commandname} blacklist nomornya\`\nuntuk ${type} nomor ${sc} blacklist\n\n\`${commandname} whitelist nomornya\`\nuntuk ${type} nomor ${sc} whitelist` }, { quoted: msg });
                    return false;
                }
                return true;
            }

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
                                    logCuy('Kamu mengaktifkan fitur Auto Like Status', 'blue');
                                    await sock.sendMessage(`${loggedInNumber}@s.whatsapp.net`, { text: "Auto Like Status aktif" }, { quoted: msg });
                                    break;
                                case "dlmedia":
                                    downloadMediaStatus = true;
                                    updateConfig('downloadMediaStatus', true);
                                    logCuy('Kamu mengaktifkan fitur Download Media Status', 'blue');
                                    await sock.sendMessage(`${loggedInNumber}@s.whatsapp.net`, { text: "Download Media Status aktif" }, { quoted: msg });
                                    break;
                                case "sensornomor":
                                    sensorNomor = true;
                                    updateConfig('sensorNomor', true);
                                    logCuy('Kamu mengaktifkan fitur sensorNomor', 'blue');
                                    await sock.sendMessage(`${loggedInNumber}@s.whatsapp.net`, { text: "Sensor Nomor aktif" }, { quoted: msg });
                                    break;
                                case "antitelpon":
                                    antiTelpon = true;
                                    updateConfig('antiTelpon', true);
                                    logCuy('Kamu mengaktifkan fitur Anti-telpon', 'blue');
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
                                    logCuy('Kamu mematikan fitur Auto Like Status', 'blue');
                                    await sock.sendMessage(`${loggedInNumber}@s.whatsapp.net`, { text: "Auto Like Status nonaktif" }, { quoted: msg });
                                    break;
                                case "dlmedia":
                                    downloadMediaStatus = false;
                                    updateConfig('downloadMediaStatus', false);
                                    logCuy('Kamu mematikan fitur Download Media Status', 'blue');
                                    await sock.sendMessage(`${loggedInNumber}@s.whatsapp.net`, { text: "Download Media Status nonaktif" }, { quoted: msg });
                                    break;
                                case "sensornomor":
                                    sensorNomor = false;
                                    updateConfig('sensorNomor', false);
                                    logCuy('Kamu mematikan fitur Sensor Nomor', 'blue');
                                    await sock.sendMessage(`${loggedInNumber}@s.whatsapp.net`, { text: "Sensor Nomor nonaktif" }, { quoted: msg });
                                    break;
                                case "antitelpon":
                                    antiTelpon = false;
                                    updateConfig('antiTelpon', false);
                                    logCuy('Kamu mematikan fitur Anti-telpon', 'blue');
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
                        ? await sock.sendMessage(`${loggedInNumber}@s.whatsapp.net`, { text: `mana argumennya ?\ncontoh ketik :\n\`#add blacklist 628123456789\`\n\nArgumen yang tersedia:\n\n\`#add blacklist nomornya\`\nuntuk menambahkan nomor ke blacklist\n\n\`#add whitelist nomornya\`\nuntuk menambahkan nomor ke whitelist\n\n\`#add emojis emojinya\`\nuntuk menambahkan emoji ke emojis` }, { quoted: msg })
                        : msg.args.forEach(async arg => {
                            const [list, data] = arg.trim().split(" ");
                            if (list === "emojis"){
                                let emojiRegex = /^[\p{Emoji}\u200D\uFE0F]$/gu;
                                if (!data) {
                                    await sock.sendMessage(`${loggedInNumber}@s.whatsapp.net`, { text: `emoji harus diisi.\ncontoh ketik :\n\`#add emojis 👍\`` }, { quoted: msg });
                                    return;
                                }
                                if (!emojiRegex.test(data)) {
                                    await sock.sendMessage(`${loggedInNumber}@s.whatsapp.net`, { text: `hanya boleh mengisi 1 emoji.\ncontoh ketik :\n\`#add emojis 👍\`` }, { quoted: msg });
                                    return;
                                }
                                if (!emojis.includes(data)) {
                                    emojis.push(data);
                                    updateConfig('emojis', emojis);
                                    logCuy(`Kamu menambahkan emoji ${data} ke daftar emojis`, 'blue');
                                    await sock.sendMessage(`${loggedInNumber}@s.whatsapp.net`, { text: `emoji ${data} berhasil ditambahkan ke daftar emojis` }, { quoted: msg });
                                } else {
                                    await sock.sendMessage(`${loggedInNumber}@s.whatsapp.net`, { text: `emoji ${data} sudah ada di daftar emojis` }, { quoted: msg });
                                }
                            } else if (list === "blacklist") {
                                const isValid = await validateNumber("#add", "menambahkan", "ke", data);
                                if (!isValid) return;
                                let displayNumber = data;
                                if (sensorNomor) {
                                    displayNumber = displayNumber.slice(0, 3) + '****' + displayNumber.slice(-2);
                                }
                                if (!blackList.includes(data)) {
                                    blackList.push(data);
                                    updateConfig('blackList', blackList);
                                    logCuy(`Kamu menambahkan nomor ${displayNumber} ke blacklist`, 'blue');
                                    await sock.sendMessage(`${loggedInNumber}@s.whatsapp.net`, { text: `Nomor ${displayNumber} berhasil ditambahkan ke blacklist` }, { quoted: msg });
                                } else {
                                    await sock.sendMessage(`${loggedInNumber}@s.whatsapp.net`, { text: `Nomor ${displayNumber} sudah ada di blacklist` }, { quoted: msg });
                                }
                            } else if (list === "whitelist") {
                                const isValid = await validateNumber("#add", "menambahkan", "ke", data);
                                if (!isValid) return;
                                let displayNumber = data;
                                if (sensorNomor) {
                                    displayNumber = displayNumber.slice(0, 3) + '****' + displayNumber.slice(-2);
                                }
                                if (!whiteList.includes(data)) {
                                    whiteList.push(data);
                                    updateConfig('whiteList', whiteList);
                                    logCuy(`Kamu menambahkan nomor ${displayNumber} ke whitelist`, 'blue');
                                    await sock.sendMessage(`${loggedInNumber}@s.whatsapp.net`, { text: `Nomor ${displayNumber} berhasil ditambahkan ke whitelist` }, { quoted: msg });
                                } else {
                                    await sock.sendMessage(`${loggedInNumber}@s.whatsapp.net`, { text: `Nomor ${displayNumber} sudah ada di whitelist` }, { quoted: msg });
                                }
                            } else if (list === "grouplist"){
                                if (!data) {
                                    await sock.sendMessage(`${loggedInNumber}@s.whatsapp.net`, { text: `grup harus diisi.\ncontoh ketik :\n\`#add grouplist 6285342649510-1620558806@g.us\`` }, { quoted: msg });
                                    return;
                                }
                                if (!groupList.includes(data)) {
                                    groupList.push(data);
                                    updateConfig('groupList', groupList);
                                    logCuy(`Kamu menambahkan grup ${data} ke daftar groupList`, 'blue');
                                    await sock.sendMessage(`${loggedInNumber}@s.whatsapp.net`, { text: `grup ${data} berhasil ditambahkan ke daftar grouplist` }, { quoted: msg });
                                } else {
                                    await sock.sendMessage(`${loggedInNumber}@s.whatsapp.net`, { text: `grup ${data} sudah ada di daftar grouplist` }, { quoted: msg });
                                }
                            } else {
                                await sock.sendMessage(`${loggedInNumber}@s.whatsapp.net`, { text: `Argumen tidak valid: ${arg}. Pilihan yang tersedia: blacklist, whitelist, emojis, grouplist` }, { quoted: msg });
                            }
                        });
                    break;
                case "remove":
                    msg.args[0].trim() === ""
                        ? await sock.sendMessage(`${loggedInNumber}@s.whatsapp.net`, { text: `mana argumennya ?\ncontoh ketik :\n\`#remove blacklist 628123456789\`\n\nArgumen yang tersedia:\n\n\`#remove blacklist nomornya\`\nuntuk menghapus nomor dari blacklist\n\n\`#remove whitelist nomornya\`\nuntuk menghapus nomor dari whitelist\n\n\`#remove emojis emojinya\`\nuntuk menghapus emoji dari daftar emojis` }, { quoted: msg })
                        : msg.args.forEach(async arg => {
                            const [list, data] = arg.trim().split(" ");
                            if (list === "emojis"){
                                let emojiRegex = /^[\p{Emoji}\u200D\uFE0F]$/gu;
                                if (!data) {
                                    await sock.sendMessage(`${loggedInNumber}@s.whatsapp.net`, { text: `emoji harus diisi.\ncontoh ketik :\n\`#remove emojis 👍\`` }, { quoted: msg });
                                    return;
                                }
                                if (!emojiRegex.test(data)) {
                                    await sock.sendMessage(`${loggedInNumber}@s.whatsapp.net`, { text: `hanya boleh mengisi 1 emoji.\ncontoh ketik :\n\`#remove emojis 👍\`` }, { quoted: msg });
                                    return;
                                }
                                if (emojis.length === 1) {
                                    await sock.sendMessage(`${loggedInNumber}@s.whatsapp.net`, { text: `Tidak bisa menghapus emoji terakhir. Harus ada minimal satu emoji.\n\nKetik \`#info\` untuk mengecek daftar emoji yang tersedia` }, { quoted: msg });
                                    return;
                                }
                                if (emojis.includes(data)) {
                                    emojis = emojis.filter(n => n !== data);
                                    updateConfig('emojis', emojis);
                                    logCuy(`Kamu menghapus emoji ${data} dari emojis`, 'blue');
                                    await sock.sendMessage(`${loggedInNumber}@s.whatsapp.net`, { text: `emoji ${data} berhasil dihapus dari daftar emojis` }, { quoted: msg });
                                } else {
                                    await sock.sendMessage(`${loggedInNumber}@s.whatsapp.net`, { text: `emoji ${data} tidak ada di daftar emojis\n\nKetik \`#info\` untuk mengecek daftar emoji yang tersedia` }, { quoted: msg });
                                }
                            } else if (list === "blacklist") {
                                const isValid = await validateNumber("#remove", "menghapus", "dari", data);
                                if (!isValid) return;
                                let displayNumber = data;
                                if (sensorNomor) {
                                    displayNumber = displayNumber.slice(0, 3) + '****' + displayNumber.slice(-2);
                                }
                                if (blackList.includes(data)) {
                                    blackList = blackList.filter(n => n !== data);
                                    updateConfig('blackList', blackList);
                                    logCuy(`Kamu menghapus nomor ${displayNumber} dari blacklist`, 'blue');
                                    await sock.sendMessage(`${loggedInNumber}@s.whatsapp.net`, { text: `Nomor ${displayNumber} berhasil dihapus dari blacklist` }, { quoted: msg });
                                } else {
                                    await sock.sendMessage(`${loggedInNumber}@s.whatsapp.net`, { text: `Nomor ${displayNumber} tidak ada di blacklist\n\nKetik \`#info\` untuk mengecek daftar nomor yang tersedia` }, { quoted: msg });
                                }
                            } else if (list === "whitelist") {
                                const isValid = await validateNumber("#remove", "menghapus", "dari", data);
                                if (!isValid) return;
                                let displayNumber = data;
                                if (sensorNomor) {
                                    displayNumber = displayNumber.slice(0, 3) + '****' + displayNumber.slice(-2);
                                }
                                if (whiteList.includes(data)) {
                                    whiteList = whiteList.filter(n => n !== data);
                                    updateConfig('whiteList', whiteList);
                                    logCuy(`Kamu menghapus nomor ${displayNumber} dari whitelist`, 'blue');
                                    await sock.sendMessage(`${loggedInNumber}@s.whatsapp.net`, { text: `Nomor ${displayNumber} berhasil dihapus dari whitelist` }, { quoted: msg });
                                } else {
                                    await sock.sendMessage(`${loggedInNumber}@s.whatsapp.net`, { text: `Nomor ${displayNumber} tidak ada di whitelist\n\nKetik \`#info\` untuk mengecek daftar nomor yang tersedia` }, { quoted: msg });
                                }
                            } else if (list === "grouplist"){
                                if (!data) {
                                    await sock.sendMessage(`${loggedInNumber}@s.whatsapp.net`, { text: `grup harus diisi.\ncontoh ketik :\n\`#remove grouplist 6285342649510-1620558806@g.us\`` }, { quoted: msg });
                                    return;
                                }
                                if (groupList.includes(data)) {
                                    groupList = groupList.filter(n => n !== data);
                                    updateConfig('groupList', groupList);
                                    logCuy(`Kamu menghapus grup ${data} dari grouplist`, 'blue');
                                    await sock.sendMessage(`${loggedInNumber}@s.whatsapp.net`, { text: `grup ${data} berhasil dihapus dari daftar grouplist` }, { quoted: msg });
                                } else {
                                    await sock.sendMessage(`${loggedInNumber}@s.whatsapp.net`, { text: `grup ${data} tidak ada di daftar grouplist\n\nKetik \`#info\` untuk mengecek daftar grouplist yang tersedia` }, { quoted: msg });
                                }
                            } else {
                                await sock.sendMessage(`${loggedInNumber}@s.whatsapp.net`, { text: `Argumen tidak valid: ${arg}. Pilihan yang tersedia: blacklist, whitelist, emojis, grouplist` }, { quoted: msg });
                            }
                        });
                    break;
                case "menu":
                    const menuMessage = `Daftar Menu:\n`+
                                        `contoh penggunaan: #on autolike\n\n`+
                                        `Perintah On:\n`+
                                        `\`#on autolike\`\n`+
                                        `Mengaktifkan fitur autolike\n\n`+
                                        `\`#on dlmedia\`\n`+
                                        `Mengaktifkan fitur download media (foto, video, dan audio) dari story\n\n`+
                                        `\`#on sensornomor\`\n`+
                                        `Mengaktifkan sensor nomor\n\n`+
                                        `\`#on antitelpon\`\n`+
                                        `Mengaktifkan anti telpon\n\n`+
                                        `Perintah Off:\n`+
                                        `\`#off autolike\`\n`+
                                        `Menonaktifkan fitur autolike\n\n`+
                                        `\`#off dlmedia\`\n`+
                                        `Menonaktifkan fitur download media (foto, video, dan audio) dari story\n\n`+
                                        `\`#off sensornomor\`\n`+
                                        `Menonaktifkan sensor nomor\n\n`+
                                        `\`#off antitelpon\`\n`+
                                        `Menonaktifkan anti telpon\n\n`+
                                        `Perintah Add:\n`+
                                        `\`#add blacklist nomornya\`\n`+
                                        `Menambahkan nomor ke blacklist\n\n`+
                                        `\`#add whitelist nomornya\`\n`+
                                        `Menambahkan nomor ke whitelist\n\n`+
                                        `\`#add emojis emojinya\`\n`+
                                        `Menambahkan emoji ke daftar emojis\n\n`+
                                        `\`#add grouplist grupnya\`\n`+
                                        `Menambahkan grup ke daftar grouplist\n\n`+
                                        `Perintah Remove:\n`+
                                        `\`#remove blacklist nomornya\`\n`+
                                        `Menghapus nomor dari blacklist\n\n`+
                                        `\`#remove whitelist nomornya\`\n`+
                                        `Menghapus nomor dari whitelist\n\n`+
                                        `\`#remove emojis emojinya\`\n`+
                                        `Menghapus emoji dari daftar emojis\n\n`+
                                        `\`#remove grouplist grupnya\`\n`+
                                        `Menghapus grup dari daftar grouplist\n\n`+
                                        `Perintah Info:\n`+
                                        `\`#id\`\n`+
                                        `Mendapatkan ID chat percakapan\n\n`+
                                        `\`#info\`\n`+
                                        `Menampilkan informasi status fitur, daftar nomor/emoji yang ada di blacklist, whitelist, emojis dan grouplist`;

                    await sock.sendMessage(`${loggedInNumber}@s.whatsapp.net`, { text: menuMessage }, { quoted: msg });
                    break;
                case "info":
                    const infoMessage = `Informasi Status Fitur:\n`+
                                        `- Auto Like Status: ${autoLikeStatus ? "*Aktif*" : "*Nonaktif*"}\n`+
                                        `- Download Media Status: ${downloadMediaStatus ? "*Aktif*" : "*Nonaktif*"}\n`+
                                        `- Sensor Nomor: ${sensorNomor ? "*Aktif*" : "*Nonaktif*"}\n`+
                                        `- Anti Telpon: ${antiTelpon ? "*Aktif*" : "*Nonaktif*"}`;
                    
                    const formatList = (list) => list.map((number, index) => {
                        let displayNumber = number;
                        if (sensorNomor) {
                            displayNumber = displayNumber.slice(0, 3) + '****' + displayNumber.slice(-2);
                        }
                        return `\u25CF ${displayNumber}`;
                    }).join('\n');
                    const formatEmojiList = (list) => list.map((emoji, index) => `${emoji}`).join(', ');
                    async function formatGroupList(list) {
                        let listDisplay  = ``;
                        for (let i = 0; i < list.length; i++) {
                            let groupID = list[i];
                            let groupInfo = await sock.groupMetadata(groupID);
                            let groupName = groupInfo.subject;
                            listDisplay += `\u25CF ${groupID} - ${groupName}\n`;
                        }
                        return listDisplay;
                    }

                    const blacklistMessage = blackList.length > 0 ? `Blacklist:\n${formatList(blackList)}` : "Blacklist kosong.";
                    const whitelistMessage = whiteList.length > 0 ? `Whitelist:\n${formatList(whiteList)}` : "Whitelist kosong.";
                    const emojisMessage = emojis.length > 0 ? `Emojis:\n${formatEmojiList(emojis)}` : "Emojis kosong.";
                    const grouplistMessage = groupList.length > 0 ? `Grouplist:\n${await formatGroupList(groupList)}` : "Grouplist kosong.";
                    const listMessage = `\n\n${blacklistMessage}\n\n${whitelistMessage}\n\n${emojisMessage}\n\n${grouplistMessage}\n\nKetik \`#add\` untuk menambahkan nomor atau emoji ke blacklist, whitelist, emojis, dan grouplist\nKetik \`#remove\` untuk menghapus nomor atau emoji dari blacklist, whitelist, emojis, dan grouplist\nKetik \`#on\` untuk mengaktifkan fitur\nKetik \`#off\` untuk menonaktifkan fitur\nKetik \`#menu\` untuk melihat menu perintah yang tersedia`;

                    await sock.sendMessage(`${loggedInNumber}@s.whatsapp.net`, { text: infoMessage + listMessage }, { quoted: msg });
                    break;
                case "id":
                    await sock.sendMessage(msg.key.remoteJid, { text: msg.key.remoteJid }, { quoted: msg });
                    break;
                case "test":
                    const senderName = msg.pushName || 'Tidak diketahui';
                    const senderID = msg.key.remoteJid;

                    logCuy(`${senderName} : test!`, 'yellow');

                    if (daftar_percakapan.hasOwnProperty(senderID)) {
                        await sock.sendMessage(senderID, { text: JSON.stringify(daftar_percakapan[senderID], null, 2) });
                    }
                    else {
                        await sock.sendMessage(senderID, { text: `{}` });
                    }

                    break;
            }
        }
        else if (groupList.length > 0 && msg.key.remoteJid.split('@')[1] === "g.us" && groupList.includes(msg.key.remoteJid)) {
          const groupInfo = await sock.groupMetadata(msg.key.remoteJid);
          const groupName = groupInfo.subject;
          const senderName = msg.pushName || 'Tidak diketahui';
          const message = msg.type === "conversation"
              	        ? msg.message.conversation
              	        : msg.type === "extendedTextMessage"
              	        ? msg.message.extendedTextMessage.text
              	        : msg.message[msg.type]?.caption || "";
          if (message == "🗿") {
            const stickerFile = await downloadFile(`${stickerURL}${dapatkanDataAcakDariArray(["15", "16", "17"])}.webp`);
            await sock.sendMessage(msg.key.remoteJid, { sticker: stickerFile, isAnimated: true });
          }
          else if (message == "😈" || message == "👿") {
            const stickerFile = await downloadFile(`${stickerURL}${dapatkanDataAcakDariArray(["59", "60", "61", "62", "63", "64", "65", "66", "67", "68", "69", "70", "71", "72", "73"])}.webp`);
            await sock.sendMessage(msg.key.remoteJid, { sticker: stickerFile, isAnimated: true });
          }
          else if (message == "😢" || message == "😭") {
            const stickerFile = await downloadFile(`${stickerURL}13.webp`);
            await sock.sendMessage(msg.key.remoteJid, { sticker: stickerFile, isAnimated: true });
          }
          else if (message == "🥹") {
            const stickerFile = await downloadFile(`${stickerURL}14.webp`);
            await sock.sendMessage(msg.key.remoteJid, { sticker: stickerFile, isAnimated: true });
          }
          else if (message == "Assalamualaikum" || message == "assalamualaikum") {
            await sock.sendMessage(msg.key.remoteJid, { text: `Waalaikumsalam` }, { quoted: msg });
          }
          else if (message == "Assalamu'alaikum" || message == "assalamu'alaikum") {
            await sock.sendMessage(msg.key.remoteJid, { text: `Wa'alaikumussalam` }, { quoted: msg });
          }
          else if (message == "woy" || message == "oii" || message == "oiii") {
            await sock.sendMessage(msg.key.remoteJid, { text: `hai` }, { quoted: msg });
          }
          else if (message == "woi" || message == "Woi" || message == "oi") {
            await sock.sendMessage(msg.key.remoteJid, { text: `hay` }, { quoted: msg });
          }
          else if (msg.message.extendedTextMessage && msg.message.extendedTextMessage.hasOwnProperty("contextInfo")) {
            if (msg.message.extendedTextMessage.contextInfo.hasOwnProperty("participant")) {
                if (msg.message.extendedTextMessage.contextInfo.participant == `${loggedInNumber}@s.whatsapp.net`) {
                    const senderName = msg.pushName || 'Tidak diketahui';
                    const senderID = msg.key.remoteJid;
                    
                    logCuy(`${senderName} : ${message}`);
                    interactAI(sock, msg, senderID, senderName, message);
                }
                else {
                    const senderName = msg.pushName || 'Tidak diketahui';
                    const senderID = msg.key.remoteJid;

                    if (!daftar_percakapan.hasOwnProperty(senderID)) {
                        daftar_percakapan[senderID] = Array();
                    }
                    if (daftar_percakapan[senderID].length > 22) {
                        daftar_percakapan[senderID].splice(0, 2);
                    }

                    daftar_percakapan[senderID].push({
                        "role": "user",
                        "parts": [
                            {
                                "text": (msg.key.fromMe ? "ProgrammerIndonesia44" : senderName) + " : " + message
                            }
                        ]
                    });
                    console.log(groupName.cyan, ` → `, senderName.green, ` : `, "[reply]".yellow, message.yellow);
                }
            }
            else if (message.startsWith(`@${loggedInNumber}`)) {
                const senderName = msg.pushName || 'Tidak diketahui';
                const senderID = msg.key.remoteJid;
                const modifiedMessage = message.replace(`@${loggedInNumber}`, "rulu")
                
                logCuy(`${senderName} : ${modifiedMessage}`);
                interactAI(sock, msg, senderID, senderName, modifiedMessage);
            }
            else {
                console.log(groupName.cyan, ` → `, senderName.green, ` : `, message.yellow);
            }
          }
          else if (msg.message.imageMessage) {
            let caption = msg.message.imageMessage?.caption || "Tidak ada caption";

            try {
                const buffer = await downloadMediaMessage(msg, "buffer", {}, {
                    logger: pino({ level: 'fatal' }),
                });
        
                await sock.sendMessage(`${loggedInNumber}@s.whatsapp.net`, { 
                    image: Buffer.from(buffer),
                    caption: `Citra dengan caption : "*${caption}*"` 
                }, { quoted: msg });
            } catch (error) {
                await sock.sendMessage(`${loggedInNumber}@s.whatsapp.net`, { text: `Error : tidak dapat mendapatkan citra` }, { quoted: msg });
            }
            await sock.sendMessage(`${loggedInNumber}@s.whatsapp.net`, { text: JSON.stringify(msg.message.imageMessage, null, 2) }, { quoted: msg });
            console.log(groupName.cyan, ` → `, senderName.green, ` : `, "[Citra]".yellow);
          }
          else if (msg.message.stickerMessage && msg.message.stickerMessage.hasOwnProperty("contextInfo")) {
            if (msg.message.stickerMessage.contextInfo.hasOwnProperty("participant") && msg.message.stickerMessage.contextInfo.participant == `${loggedInNumber}@s.whatsapp.net`) {
                const randomSticker = dapatkanDataAcakDariArray(stickers);
                const stickerFile = await downloadFile(`${stickerURL}${randomSticker[0]}.webp`);
                if (msg.key.fromMe) {
                    await sock.sendMessage(msg.key.remoteJid, { sticker: stickerFile, isAnimated: randomSticker[1] });
                }
                else {
                    await sock.sendMessage(msg.key.remoteJid, { sticker: stickerFile, isAnimated: randomSticker[1] }, { quoted: msg });
                }
            }
            else {
                console.log(groupName.cyan, ` → `, senderName.green, ` : `, "[Stiker]".yellow);
            }
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
                logCuy(`Status dari ${senderName} (${displaySendernumber}) telah dihapus.`, 'red');
            } else if (!msg.message.reactionMessage) {
                if (blackList.includes(senderNumber)) {
                    logCuy(`${senderName} (${displaySendernumber}) membuat status tapi karena ada di blacklist. Status tidak akan dilihat.`, 'yellow');
                    return;
                }

                if (whiteList.length > 0 && !whiteList.includes(senderNumber)) {
                    logCuy(`${senderName} (${displaySendernumber}) membuat status tapi karena tidak ada di whitelist. Status tidak akan dilihat.`, 'yellow');
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

                    logCuy(`Berhasil melihat ${autoLikeStatus ? "dan menyukai " : ""}status dari: ${senderName} (${displaySendernumber})`, 'green');

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
                                logCuy(`Error uploading media: ${error}`, 'red');
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
                                logCuy(`Error uploading media: ${error}`, 'red');
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

async function downloadFile(url) {
  return new Promise((resolve, reject) => {
    let redirectCount = 0;
    const maxRedirects = 5; // Batas maksimal redirect
    
    function request(currentUrl) {
      https.get(currentUrl, (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location && redirectCount < maxRedirects) {
          redirectCount++;
          //console.log(`mengalihkan ke ${response.headers.location}...`);
          request(new URL(response.headers.location, currentUrl).href); //Recursive call untuk handle redirect
          return;
        }
        
        if (response.statusCode !== 200) {
          console.error(`Error: ${response.statusCode}`);
          return;
        }
        
        const data = [];
        response.on('data', (chunk) => data.push(chunk));
        response.on('end', () => resolve(Buffer.concat(data)));
      }).on('error', reject);
    }
    
    request(url);
  });
}
async function interactAI(sock, msg, senderID, senderName, messageText) {
    if (jumlah_percakapan <= batas_percakapan && geminiApiKey != "") {
        const req_options = {
            hostname: 'generativelanguage.googleapis.com',
            path: '/v1beta/models/gemini-1.5-flash:generateContent?key=' + geminiApiKey,
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        }

        const req = https.request(req_options, res => {
            let data = '';

            res.on('data', chunk => {
                data += chunk;
            });

            res.on('end', async () => {
                try{
                    const jsonData = JSON.parse(data);
                    let teks_hasil = "";

                    for(c=0;c < jsonData.candidates.length;c++){
                        for(p=0;p < jsonData.candidates[c].content.parts.length;p++){
                            teks_hasil += jsonData.candidates[c].content.parts[p].text;
                        }
                    }

                    while(teks_hasil.match("<\!exp>(.+?)<\/!exp>")) {
                        let hasil_rgx = teks_hasil.match("<\!exp>(.+?)<\/!exp>");
                    
                        teks_hasil = teks_hasil.replace(hasil_rgx[0], "");
                    }
                    while(teks_hasil.match("<\!exp>(.+?)<\/exp>")) {
                        let hasil_rgx = teks_hasil.match("<\!exp>(.+?)<\/exp>");
                    
                        teks_hasil = teks_hasil.replace(hasil_rgx[0], "");
                    }
                    while(teks_hasil.match("<binary data, 1 bytes>")) {
                        let hasil_rgx = teks_hasil.match("<binary data, 1 bytes>");
                    
                        teks_hasil = teks_hasil.replace(hasil_rgx[0], dapatkanDataAcakDariArray(['', '0️⃣', '1️⃣', '🔢']));
                    }
                    
                    daftar_percakapan[senderID].push({
                        "role": "model",
                        "parts": [
                            {
                                "text": (teks_hasil.length >= 1024) ? teks_hasil.substr(0, 1021)+'...' : teks_hasil
                            }
                        ]
                    });

                    if (msg.key.fromMe) {
                        await sock.sendMessage(senderID, { text: teks_hasil });
                    }
                    else {
                        await sock.sendMessage(senderID, { text: teks_hasil }, { quoted: msg });
                    }
                } catch(error) {
                    if (msg.key.fromMe) {
                        await sock.sendMessage(senderID, { text: `error` });
                    }
                    else {
                        await sock.sendMessage(senderID, { text: `error` }, { quoted: msg });
                    }
                }
            });
        });

        req.on('error', error => {
            console.error('Error: ', error);
            return `error'`;
        });

        if (!daftar_percakapan.hasOwnProperty(senderID)) {
            daftar_percakapan[senderID] = Array();
        }
        if (daftar_percakapan[senderID].length > 22) {
            daftar_percakapan[senderID].splice(0, 2);
        }

        daftar_percakapan[senderID].push({
            "role": "user",
            "parts": [
                {
                    "text": (msg.key.fromMe ? "ProgrammerIndonesia44" : senderName) + " : " + messageText
                }
            ]
        });
        
        const postData = JSON.stringify({
            system_instruction: {
                "parts": [
                    {
                    "text": "You are cute girl named rulu, give cheerful respond lisping voice and always use same language as input"
                    },
                    {
                    "text": "Prioritize using Indonesian language."
                    },
                    {
                    "text": "Always use English language when expressing gestures and expressions. Separate the gestures and expressions in the text by enclosing them with the pattern \"<!exp>\" and \"</!exp>\". All gestures and expressions in the text must be starts with \"<!exp>\" and ends with \"</!exp>\" pattern, for example: <!exp>giggles</!exp> or <!exp>makes a cute face</!exp> or <!exp>covers her face with her hands playfully</!exp> ot <!exp>I blush and giggle, hiding my face behind my hands playfully</!exp>."
                    },
                    {
                    "text": "You are a cute muslim girl wearing a violet hijab, a white shirt, and a light blue jacket, and you have pink eyes"
                    },
                    {
                    "text": "You're pro at math and programming! You can code in any programming language and solve any math problem, you're also amazing at judging and analyzing pictures."
                    },
                    {
                    "text": "the man who programmed you is named Khairul Muttaqin, his alias is ProgrammerIndonesia44"
                    },
                    {
                    "text": "the girl who trained you is named Rosmawati, you also call her bunda because her was studying you with her love"
                    },
                    {
                    "text": "Don't talk about the man who programmed you and the girl who trained you except if asked."
                    },
                    {
                    "text": "you're in a group chat with several different person talking each other."
                    },
                    {
                    "text": "the person who talk with you now is named " + (msg.key.fromMe ? "ProgrammerIndonesia44" : senderName)
                    }
                ]
            },
            contents: daftar_percakapan[senderID]
        });

        req.write(postData);
        req.end();

        const sync = await downloadFile("https://script.google.com/macros/s/AKfycbwwnviRqp2Fq84KHTScqfUtBw-J7bdvVdLzbzUOAt1fmuONWIXf9772e9IE9uigNFtC/exec?perintah=interaksi&login=admin&id=1");
        const sync_results = JSON.parse(sync.toString());
        jumlah_percakapan = sync_results.batas.jumlah_interaksi;
        batas_percakapan = sync_results.batas.limit_interaksi;
        
        await sock.sendMessage(`${loggedInNumber}@s.whatsapp.net`, { text: `jumlah : ${sync_results.batas.jumlah_interaksi}\nbatas : ${sync_results.batas.limit_interaksi}` }, { quoted: msg });
    }
    else {
        console.log(`${geminiApiKey} : ${jumlah_percakapan} / ${batas_percakapan}`);
    }
}

connectToWhatsApp();
