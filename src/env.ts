import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	client: {
		// Shown in the document title and header fallbacks when no project is open.
		// Consumed by __root for the document title.
		VITE_APP_TITLE: z.string().min(1).default("platipie-cms"),
	},

	clientPrefix: "VITE_",

	emptyStringAsUndefined: true,

	runtimeEnv: import.meta.env,
	server: {
		// Public origin the CMS server is reachable at. Required in production
		// so absolute URLs (media, previews) resolve; unset only for local dev.
		SERVER_URL: z.string().url().optional(),
	},
});
