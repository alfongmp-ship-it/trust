/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      // Permite subir PDFs hasta 5 MB vía Server Actions. Si necesitamos
      // archivos mayores, migrar a upload directo desde el cliente con
      // signed URLs (Supabase Storage soporta hasta 25 MB en el bucket).
      bodySizeLimit: '5mb',
    },
  },
}

export default nextConfig
