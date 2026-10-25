import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
	component: IndexRedirect,
	head: () => ({ meta: [{ title: "platipie-cms" }] }),
});

function IndexRedirect() {
	return <Navigate replace to="/dashboard" />;
}
