# Auto Read Story Whatsapp
Auto Read Story/Status WhatsApp adalah bot sederhana yang memungkinkan kamu melihat status/story teman-teman WhatsAppmu secara otomatis, sehingga kamu menjadi orang pertamax yang melihat storynyaw.

## Instalasi :
### Windows
1. Nodejs :<br>
   https://nodejs.org/id
2. Git    :<br>
   https://git-scm.com/downloads
### Ubuntu/Debian
1. Nodejs :
   ```bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash && nvm install 22
   ```
   
2. Git :
   ```bash
   sudo apt update && sudo apt install -y git
   ```
   
### Termux (Android)
1. Nodejs + git :
   ```bash
   pkg update && pkg install git nodejs-lts
   ```

## Cara menjalankan bot :
### 1. Menggunakan terminal masing-masing
1. Buka Terminal kesayangan kalian (⁠ ⁠╹⁠▽⁠╹⁠ ⁠) 👍
   
2. Clone repository
   ```bash
   git clone https://github.com/jauhariel/AutoReadStoryWhatsapp.git
   ```
3. Masuk ke repository
   ```bash
   cd AutoReadStoryWhatsapp
   ```
4. Ketik
   ```bash
   npm i
   ```
5. Ketik
   ```bash
   npm start
   ```
6. Enjoy

### 2. Menggunakan bot-hosting.net
1. Kunjungi web https://bot-hosting.net/panel/
2. Login dengan akun discordmu
3. Dapatkan 10 koin gratis setiap hari di https://bot-hosting.net/panel/earn
4. Setelah mendapatkan koin, langsung buat server di https://bot-hosting.net/panel/create
5. Isi nama server sesuai keinginan, pilih tipe server <strong>Node.js</strong>, pilih plan <strong>Starter</strong>, pilih billing <strong>Weekly</strong>, lalu klik <strong>Create Server</strong>.
6. Setelah berhasil membuat server, masuk ke https://control.bot-hosting.net/, lalu klik nama servermu.
7. Klik <strong>FILES</strong>, klik <strong>NEW FILE</strong>, lalu masukkan kode berikut :
   
   ```bash
   #!/bin/bash

   REPO_URL="https://github.com/jauhariel/AutoReadStoryWhatsapp.git"
   DIR_NAME="AutoReadStoryWhatsapp"
   
   echo "Memeriksa apakah repository sudah ada..."
   if [ ! -d "$DIR_NAME" ]; then
       echo "Mengclone repository..."
       git clone $REPO_URL || { echo "Gagal mengclone repository!"; exit 1; }
   else
       echo "Repository sudah ada, memperbarui repository..."
       cd $DIR_NAME && git pull || { echo "Gagal memperbarui repository!"; exit 1; }
   fi
   
   echo "Masuk ke direktori repository"
   cd $DIR_NAME
   
   echo "Menginstall package yang dibutuhkan..."
   npm i || { echo "Gagal menginstall package!"; exit 1; }
   
   echo "Menjalankan bot"
   npm start
   ```
8. Klik <strong>CREATE FILE</strong>, simpan file dengan nama <strong>bot.sh</strong> lalu klik <strong>CREATE FILE</strong>.
9. Klik <strong>STARTUP</strong>, scroll kebawah pada bagian <strong>START BASH FILE</strong> isi dengan <strong>bot.sh</strong>
10. Klik <strong>CONSOLE</strong> kemudian klik <strong>START</strong> untuk mulai menjalankan server
11. Enjoy!
    
<hr>

## Catatan
1. Kamu bisa menambahkan nomor yang tidak ingin kamu lihat story-nya secara otomatis di file <strong>blacklist.txt</strong>.

2. Klik <strong>CTRL</strong> dan <strong>C</strong> pada keyboard secara bersamaan untuk memberhentikan bot!
   
3. Hapus folder <strong>sessions</strong> jika ingin login dengan nomor lain atau jika terjadi masalah login, seperti stuck di 'menghubungkan ke wangsaf', lalu jalankan ulang dengan mengetik:
   ```bash
   npm start
   ```
