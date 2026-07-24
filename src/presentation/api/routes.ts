import { Router } from "express";
import { GetCreditLineByUserIdQueryService } from "../../application/service/get-credit-line-by-user-id-query-service";
import type { CreditLineRepository } from "../../domain/repository/credit-line-repository";
import { InMemoryCreditLineRepository } from "../../infrastructure/persistence/in-memory/in-memory-credit-line-repository";
import { CreditLineController } from "./credit-line-controller";
import type {
    GetCreditLineRequest,
    GetCreditLineResponse
} from "./credit-line-controller";

export function createRoutes(): Router {
    const router: Router = Router();

    // Punto de composición: conectamos la aplicación con infraestructura reemplazable.
    const creditLineRepository: CreditLineRepository =
        new InMemoryCreditLineRepository();

    const getCreditLineByUserIdQueryService: GetCreditLineByUserIdQueryService =
        new GetCreditLineByUserIdQueryService(creditLineRepository);

    const creditLineController: CreditLineController = new CreditLineController(
        getCreditLineByUserIdQueryService
    );

    router.get(
        "/users/:userId/credit-line",
        (req: GetCreditLineRequest, res: GetCreditLineResponse) =>
            creditLineController.getCreditLineByUserId(req, res)
    );

    return router;
}
