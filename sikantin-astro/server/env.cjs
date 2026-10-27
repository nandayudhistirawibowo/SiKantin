const path = require('path');
const dotenv = require('dotenv');

// Memaksa Node.js membaca file .env secara absolut (mutlak)
const envPath = path.resolve(__dirname, '../.env');

// Load file .env
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error("Gagal memuat file .env di path:", envPath);
  console.error(result.error);
} else {
  console.log(`Berhasil memuat ${Object.keys(result.parsed).length} variabel dari .env`);
}

module.exports = {
  // Lo bisa export variabel di sini kalau butuh, 
  // tapi biasanya kodingan lain langsung akses via process.env
};