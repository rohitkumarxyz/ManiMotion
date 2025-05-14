import { client } from "database/client"
import { chatApiValidation, loginApiValidation } from "types/types"
import "./config/env"
import express, { Request, Response } from "express"
import cors from "cors"
import { AWS_REGION, PORT, SQS_URL } from "./config/config.js"
import { adminCheck, userCheck } from "./middleware/middleware"
import { generateJwtToken } from "./service/jwt.service"
import { getLlmResponse } from "./service/ai"
import { generateVideoPrompt } from "./defaultPrompt/prompt"
import { SQSClient } from "@aws-sdk/client-sqs";
import { SendMessageCommand } from "../../../node_modules/@aws-sdk/client-sqs/dist-types/commands/SendMessageCommand"

const app = express();
//app configuration
app.use(cors())
app.use(express.json())


const sqs = new SQSClient({ region: AWS_REGION })

//public routes
app.post("/login", async (req: Request, res: Response): Promise<any> => {
    try {
        const isValidate = loginApiValidation.safeParse(req.body);
        if (!isValidate.success) {
            return res.status(400).json({
                status: false,
                message: isValidate.error.errors[0]?.message || "Validation failed",
            });
        }

        const { email, name, googleToken } = isValidate.data;

        let user = await client.user.findUnique({
            where: { email },
        });

        if (!user) {
            user = await client.user.create({
                data: {
                    name,
                    email,
                    googleToken,
                },
            });
        }

        const token = await generateJwtToken({
            id: user.id,
            name: user.name,
            email: user.email,
            googleToken: user.googleToken,
            role: user.role,
        });

        return res.status(200).json({
            status: true,
            message: "Login successful.",
            token,
        });
    } catch (error) {
        return res.status(500).json({
            status: false,
            message: error.message || "An unexpected error occurred."
        })
    }
});


app.get("/pricing", async (req: Request, res: Response): Promise<any> => {
    try {
        const data = await client.Pricing.findMany();
        return res.status(200).json({
            status: true,
            message: "Pricing details fetched successfully",
            data,
        });
    } catch (error: any) {
        return res.status(500).json({
            status: false,
            message: error.message || "An unexpected error occurred.",
        });
    }
});



//user specific 
app.use(userCheck);

// get profile
app.get("/profile", async (req: Request, res: Response): Promise<any> => {
    try {
        const id = req.user.id;

        const userData = await client.user.findUnique({
            where: {
                id: id,
            },
        });

        if (!userData) {
            return res.status(404).json({
                status: false,
                message: "User not found.",
            });
        }

        return res.status(200).json({
            status: true,
            message: "Profile fetched successfully.",
            data: userData,
        });

    } catch (error: any) {
        return res.status(500).json({
            status: false,
            message: error.message || "An unexpected error occurred.",
        });
    }
});


app.post("/chat", async (req: Request, res: Response): Promise<any> => {
    try {
        const parsed = chatApiValidation.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                status: false,
                message: parsed.error.errors[0]?.message || "Validation failed"
            });
        }

        const { prompt } = parsed.data;

        if (!req.user || !req.user.id) {
            return res.status(401).json({
                status: false,
                message: "Unauthorized: user not found",
            });
        }

        const project = await client.Project.create({
            data: {
                prompts: prompt,
                userId: req.user.id,
            }
        });

        const llmResponse = await getLlmResponse(prompt, {}, generateVideoPrompt);

        if (!llmResponse || typeof llmResponse !== "string") {
            return res.status(500).json({
                status: false,
                message: "LLM failed to generate a response",
            });
        }

        await client.Project.update({
            where: { id: project.id },
            data: {
                code: llmResponse,
            }
        });

        const payload = {
            projectId: project.id,
        };

        const command = new SendMessageCommand({
            MessageBody: JSON.stringify(payload),
            QueueUrl: SQS_URL,
        });

        await sqs.send(command);

        return res.status(200).json({
            status: true,
            message: "LLM response generated successfully",
            data: {
                projectId: project.id,
                llmResponse,
            }
        });
    } catch (error) {
        console.error("Error in /chat:", {
            error,
            userId: req.user?.id,
            body: req.body,
        });
        return res.status(500).json({
            status: false,
            message: "Internal server error",
        });
    }
});






//user routes
//for first message and also for fixing message






app.listen(PORT, () => {
    console.log(`server is running http://localhost:${PORT}`)
})