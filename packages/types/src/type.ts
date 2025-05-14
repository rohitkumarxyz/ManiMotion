import z from "zod";

export const chatApiValidation = z.object({
    prompt: z.array(
        z.object({
            role: z.enum(["user", "system"]),
            content: z.string(),
        })
    ),
    type: z.string({ message: "type should be string." }).optional()
});

export const loginApiValidation = z.object({
    email: z.string({ required_error: "Email is required" }).email({ message: "Invalid email address" }),
    name: z.string({ required_error: "Name is required" }),
    googletoken: z.string({ required_error: "Google token is required" }),
});