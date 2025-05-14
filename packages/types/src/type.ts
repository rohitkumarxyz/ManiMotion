import z from "zod";

export const chatApiValidation = z.object({
    prompt: z.array(
        z.object({
            role: z.enum(["user", "system"]),
            content: z.string(),
        })
    ),
    type:z.string().optional()
});