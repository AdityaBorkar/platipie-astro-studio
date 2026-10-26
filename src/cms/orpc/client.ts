import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { RouterClient } from "@orpc/server";

import type { cmsRouter } from "./router.ts";

export type CmsRouterClient = RouterClient<typeof cmsRouter>;

export function createCmsClient(origin: string): CmsRouterClient {
	const link = new RPCLink({ url: `${origin}/api/rpc` });
	return createORPCClient(link);
}

export function browserCmsClient(): CmsRouterClient {
	return createCmsClient(window.location.origin);
}
