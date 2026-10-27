import { redirect } from "next/navigation"
import { getOrgContext } from "@/lib/db/org"
import { getAssemblies } from "@/lib/db/assemblies"
import { getProjects, getProjectById } from "@/lib/db/projects"
import { getJobs } from "@/lib/db/jobs"
import { HouseTakeoffClient } from "./house-takeoff-client"

export default async function HouseTakeoffPage({
	searchParams,
}: {
	searchParams: Promise<{ project?: string }>
}) {
	const orgContext = await getOrgContext()
	if (!orgContext || orgContext.role === "worker") redirect("/dashboard")

	const { project: projectId } = await searchParams

	const [assemblies, projects, jobs, activeProject] = await Promise.all([
		getAssemblies(),
		getProjects(),
		getJobs(orgContext.orgId),
		projectId ? getProjectById(projectId) : Promise.resolve(null),
	])

	return (
		<HouseTakeoffClient
			initialAssemblies={assemblies}
			initialProjects={projects}
			initialProject={activeProject}
			jobs={jobs}
			role={orgContext.role}
		/>
	)
}
