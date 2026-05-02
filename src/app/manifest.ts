import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
	return {
		name: "Kestrel Developments",
		short_name: "Kestrel",
		description: "Construction Management Dashboard",
		start_url: "/dashboard",
		display: "standalone",
		background_color: "#fafaf9",
		theme_color: "#8b2c2c",
		icons: [
			{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
			{ src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
		],
	}
}
