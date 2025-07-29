import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    domains: ['tvdwepumtrrjpkvnitpw.supabase.co', 'dmujeres.pe', 'dzjriwltkueglrmzqnni.supabase.co'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'tvdwepumtrrjpkvnitpw.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'dzjriwltkueglrmzqnni.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;
