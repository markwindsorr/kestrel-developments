import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { ServiceWorkerRegistrar } from "@/components/pwa/sw-registrar"
import "./globals.css"

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"]
})

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"]
})

export const metadata: Metadata = {
	title: "Kestrel Developments",
	description: "Construction Management Dashboard"
}

export default function RootLayout({
	children
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		<html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
			<body className="min-h-full flex flex-col">
				{children}
				<ServiceWorkerRegistrar />
			</body>
		</html>
	)
}
