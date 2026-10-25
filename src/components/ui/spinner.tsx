import { cn } from "cn";
import { Loader2Icon } from "lucide-react";

function Spinner({ className, ...props }: React.ComponentProps<"output">) {
	return (
		<output
			aria-label="Loading"
			className={cn("inline-flex size-4", className)}
			data-slot="spinner"
			{...props}
		>
			<Loader2Icon className="size-full animate-spin" />
		</output>
	);
}

export { Spinner };
