import { Router, type IRouter } from "express";
import healthRouter from "./health";
import routingRouter from "./routing";

const router: IRouter = Router();

router.use(healthRouter);
router.use(routingRouter);

export default router;
