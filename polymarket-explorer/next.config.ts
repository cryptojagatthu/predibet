import type { NextConfig } from "next";
const nextConfig: NextConfig = {
images: {
remotePatterns: [
{
protocol: "https",
hostname: "polymarket-upload.s3.us-east-2.amazonaws.com",
},
{
protocol: "https",
hostname: "**.polymarket.com",
},
{
protocol: "https",
hostname: "**.s3.amazonaws.com",
},
],
},
};
export default nextConfig;
