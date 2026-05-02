"use client"

import { useActionState, useState } from "react"
import { login, signup } from "@/app/login/actions"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"

export function LoginForm() {
	const [mode, setMode] = useState<"login" | "signup">("login")
	const [loginState, loginAction, loginPending] = useActionState(login, {
		error: "",
	})
	const [signupState, signupAction, signupPending] = useActionState(signup, {
		error: "",
	})

	const state = mode === "login" ? loginState : signupState
	const pending = mode === "login" ? loginPending : signupPending

	async function handleGoogleSignIn() {
		const supabase = createClient()
		await supabase.auth.signInWithOAuth({
			provider: "google",
			options: {
				redirectTo: `${window.location.origin}/auth/callback`,
			},
		})
	}

	return (
		<div className="space-y-6">
			<button
				type="button"
				onClick={handleGoogleSignIn}
				className="flex w-full items-center justify-center gap-3 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50"
			>
				<svg className="h-5 w-5" viewBox="0 0 24 24">
					<path
						d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
						fill="#4285F4"
					/>
					<path
						d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
						fill="#34A853"
					/>
					<path
						d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
						fill="#FBBC05"
					/>
					<path
						d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
						fill="#EA4335"
					/>
				</svg>
				Continue with Google
			</button>

			<div className="relative">
				<div className="absolute inset-0 flex items-center">
					<div className="w-full border-t border-neutral-200" />
				</div>
				<div className="relative flex justify-center text-xs">
					<span className="bg-neutral-50 px-2 text-neutral-500">or</span>
				</div>
			</div>

			<form
				action={mode === "login" ? loginAction : signupAction}
				className="space-y-4"
			>
				{state.error !== "" && (
					<div className="rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">
						{state.error}
					</div>
				)}

				{mode === "signup" && (
					<div>
						<label
							htmlFor="name"
							className="mb-1 block text-sm font-medium text-neutral-700"
						>
							Full Name
						</label>
						<input
							id="name"
							name="name"
							type="text"
							required
							className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
							placeholder="Josh Thornhill"
						/>
					</div>
				)}

				<div>
					<label
						htmlFor="email"
						className="mb-1 block text-sm font-medium text-neutral-700"
					>
						Email
					</label>
					<input
						id="email"
						name="email"
						type="email"
						required
						className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
						placeholder="you@example.com"
					/>
				</div>

				<div>
					<label
						htmlFor="password"
						className="mb-1 block text-sm font-medium text-neutral-700"
					>
						Password
					</label>
					<input
						id="password"
						name="password"
						type="password"
						required
						minLength={6}
						className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
						placeholder={mode === "signup" ? "At least 6 characters" : "Your password"}
					/>
				</div>

				<Button
					type="submit"
					variant="primary"
					size="lg"
					className="w-full"
					disabled={pending}
				>
					{pending
						? mode === "login"
							? "Signing in..."
							: "Creating account..."
						: mode === "login"
							? "Sign In"
							: "Create Account"}
				</Button>
			</form>

			<p className="text-center text-sm text-neutral-500">
				{mode === "login" ? (
					<>
						Don&apos;t have an account?{" "}
						<button
							type="button"
							onClick={() => setMode("signup")}
							className="font-medium text-brand-600 hover:underline"
						>
							Sign up
						</button>
					</>
				) : (
					<>
						Already have an account?{" "}
						<button
							type="button"
							onClick={() => setMode("login")}
							className="font-medium text-brand-600 hover:underline"
						>
							Sign in
						</button>
					</>
				)}
			</p>
		</div>
	)
}
