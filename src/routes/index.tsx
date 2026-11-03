import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
	component: IndexRedirect,
	head: () => ({ meta: [{ title: "platipie-astro-studio" }] }),
});

function IndexRedirect() {
	return <Navigate replace to="/dashboard" />;
}
