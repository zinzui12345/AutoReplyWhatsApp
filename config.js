let autoLikeStatus = true; // ubah jadi false jika tidak ingin otomatis menyukai status
let downloadMediaStatus = false; // ubah jadi true jika ingin mendownload media(foto, video, audio) dari status
let sensorNomor = true; // ubah jadi false jika tidak ingin menyensor nomor yang ada di dalam status
let blackList = ["628987654321", "628123456789"]; // nomor yang ada di dalam array ini tidak akan dilihat statusnya
let whiteList = []; // jika array ini tidak kosong, hanya nomor yang ada di dalam array ini yang akan dilihat statusnya

module.exports = { autoLikeStatus, downloadMediaStatus, sensorNomor, blackList, whiteList };