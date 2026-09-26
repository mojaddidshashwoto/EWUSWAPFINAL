import { createTRPCReact } from "@trpc/react-query";

export type AppRouter = any;

export const trpc = createTRPCReact<AppRouter>();
