import { LoginForm } from "@/components/auth/login-form"

export default function LoginPage() {
	return (
		<div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
			<div className="w-full max-w-sm">
				<div className="mb-8 text-center">
					<h1 className="text-2xl font-bold text-neutral-900">
						Kestrel Developments
					</h1>
					<p className="mt-2 text-sm text-neutral-500">
						Sign in to your account
					</p>
				</div>
				<LoginForm />
			</div>
		</div>
	)
}
