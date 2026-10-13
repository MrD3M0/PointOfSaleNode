import express, { Router } from "express";
import authRouter from "./modules/auth/routes";
import categoryRouter from "./modules/categories/routes";
import productRouter from "./modules/product/routes";
import batchRouter from "./modules/batch/routes";
import billRouter from "./modules/bill/routes";

const router: Router = express.Router();

router.use("/auth", authRouter);
router.use("/category", categoryRouter);
router.use("/product", productRouter);
router.use("/batch", batchRouter);
router.use("/bill", billRouter);

export default router;
