# Auto Read Story Whatsapp
Auto Read Story/Status WhatsApp adalah bot sederhana yang memungkinkan kamu melihat dan menyukai status/story teman-teman WhatsAppmu secara otomatis, sehingga kamu menjadi orang pertamax yang melihat dan menyukai storynyaw.

<p align="center">
  <img src="testing.jpg" alt="testing" width="500">
</p>

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
<hr>

## Catatan
1. Kamu bisa menambahkan nomor yang tidak ingin kamu lihat story-nya secara otomatis di file <strong>blacklist.txt</strong>.
   
2. Kamu bisa menambahkan hanya nomor tertentu yang ingin kamu lihat story-nya secara otomatis di file <strong>whitelist.txt</strong>.
   
3. Jika kamu ingin melihat story dari semua kontak, kosongkan isi file <strong>blacklist.txt</strong> dan <strong>whitelist.txt</strong>.

4. Klik <strong>CTRL</strong> dan <strong>C</strong> pada keyboard secara bersamaan untuk memberhentikan bot!
   
5. Hapus folder <strong>sessions</strong> jika ingin login dengan nomor lain atau jika terjadi masalah login, seperti stuck di 'menghubungkan ke wangsaf', lalu jalankan ulang dengan mengetik:
   ```bash
   npm start
   ```
