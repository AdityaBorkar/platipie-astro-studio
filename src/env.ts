import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	client: {
		VITE_APP_TITLE: z.string().min(1).optional(),
	},

	clientPrefix: "VITE_",

	emptyStringAsUndefined: true,

	runtimeEnv: import.meta.env,
	server: {
		SERVER_URL: z.string().url().optional(),
	},
});
