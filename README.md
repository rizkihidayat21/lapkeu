
  # Buat Laporan Keuangan Excel

  Aplikasi React + Vite untuk pencatatan transaksi dan laporan keuangan yang sekarang sudah disiapkan untuk backend Supabase.

  ## Setup lokal

  1. Install dependency:
     `npm install`
  2. Copy `.env.example` menjadi `.env`
  3. Isi:
     `VITE_SUPABASE_URL`
     `VITE_SUPABASE_ANON_KEY`
  4. Jalankan SQL di `supabase/schema.sql` melalui Supabase SQL Editor
  5. Buat 1 akun admin di Supabase Auth:
     buka `Authentication > Users > Add user`
  6. Start app:
     `npm run dev`

  ## Stack deploy

  - Frontend: Vercel
  - Backend/Auth/Database: Supabase

  ## Catatan keamanan

  - Login menggunakan satu akun admin Supabase Auth
  - Data transaksi dilindungi dengan Row Level Security
  - Validasi dilakukan di frontend dan di level database
  - Password bisa diubah dari menu `Ubah Password` setelah login
  
