import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	// pdfjs-dist and fabric pull in `canvas` only on the Node-render path.
	// Marking it external keeps Next's bundler from trying to bundle a
	// platform-native binary.
	serverExternalPackages: ["canvas"],

	// Plan PDFs can be tens of MB; default server-action body limit is 1MB.
	experimental: {
		serverActions: {
			bodySizeLimit: "50mb",
		},
	},
};

export default nextConfig;
