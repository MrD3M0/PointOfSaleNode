import { Router } from "express";
import BatchController from "./controller";
import { isAdmin, isUser } from "@/middlewares/isUser";

const batchRouter: Router = Router();

batchRouter.get("/product/:productId", isUser, BatchController.getByProductId);
batchRouter.post("/", isUser, BatchController.create);
batchRouter.get("/:id", isUser, BatchController.getById);
batchRouter.patch("/:id", isUser, BatchController.update);
batchRouter.delete("/:id", isAdmin, BatchController.delete);

export default batchRouter;
