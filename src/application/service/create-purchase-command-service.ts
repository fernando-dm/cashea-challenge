import type { PurchaseIdGenerator } from "../gateway/purchase-id-generator";
import type { CreatePurchaseRequest } from "../dto/request/create-purchase-request";
import type { CreatePurchaseResponse } from "../dto/response/create-purchase-response";
import { CreditLineNotFoundError } from "../exception/credit-line-not-found-error";
import { InsufficientCreditError } from "../exception/insufficient-credit-error";
import { InvalidPurchaseAmountError } from "../exception/invalid-purchase-amount-error";
import type {
    TransactionalRepositories,
    TransactionManager
} from "../transaction/transaction-manager";
import type { CreditLine } from "../../domain/model/credit-line";
import type { Installment } from "../../domain/model/installment";
import type { Money } from "../../domain/model/money";
import { Currency } from "../../domain/model/money";
import type { Purchase } from "../../domain/model/purchase";
import type { PurchaseFinancingPlan } from "../../domain/model/purchase-financing-plan";
import { PurchaseStatus } from "../../domain/model/purchase";
import type { CreditLineRepository } from "../../domain/repository/credit-line-repository";
import { PurchaseFinancingPlanCreator } from "./purchase-financing-plan-creator";

export class CreatePurchaseCommandService {
    constructor(
        private readonly transactionManager: TransactionManager,
        private readonly purchaseIdGenerator: PurchaseIdGenerator,
        private readonly purchaseFinancingPlanCreator: PurchaseFinancingPlanCreator
    ) {}

    async execute(createPurchaseRequest: CreatePurchaseRequest): Promise<CreatePurchaseResponse> {
        const purchaseDate: Date = new Date();

        // Validamos reglas mínimas propias de una compra antes de consultar datos.
        this.validate(createPurchaseRequest);

        // Compra y reserva de crédito se persisten como una única unidad de trabajo.
        return this.transactionManager.execute(
            async (repositories: TransactionalRepositories): Promise<CreatePurchaseResponse> =>
                this.createPurchaseContract(
                    createPurchaseRequest,
                    purchaseDate,
                    repositories
                )
        );
    }

    private async createPurchaseContract(
        createPurchaseRequest: CreatePurchaseRequest,
        purchaseDate: Date,
        repositories: TransactionalRepositories
    ): Promise<CreatePurchaseResponse> {
        // Obtenemos la línea de crédito aprobada del usuario.
        const creditLine: CreditLine =
            await this.findCreditLineByUserId(
                repositories.creditLineRepository,
                createPurchaseRequest.userId
            );

        // Construimos el monto de compra con la moneda local del sistema.
        const purchaseAmount: Money = this.createPurchaseAmount(createPurchaseRequest);

        // Creamos el plan financiero: cuotas, pago inicial y crédito a reservar.
        const purchaseFinancingPlan: PurchaseFinancingPlan =
            this.purchaseFinancingPlanCreator.create(
                purchaseAmount,
                createPurchaseRequest.installments,
                purchaseDate
            );

        // Confirmamos que el crédito disponible alcance para el saldo financiado.
        this.validateAvailableCredit(
            createPurchaseRequest.userId,
            purchaseFinancingPlan.creditToReserve,
            creditLine
        );

        // Creamos el agregado de compra listo para persistir.
        const purchase: Purchase = this.createPurchase(
            createPurchaseRequest,
            purchaseAmount,
            purchaseFinancingPlan.installmentPlan,
            purchaseDate
        );
        const savedPurchase: Purchase =
            await repositories.purchaseRepository.save(purchase);

        // Reservamos crédito por las cuotas que quedan pendientes.
        await this.reserveCredit(
            repositories.creditLineRepository,
            creditLine,
            purchaseFinancingPlan.creditToReserve,
            purchaseDate
        );

        // Devolvemos el contrato público del endpoint.
        return this.toResponse(savedPurchase);
    }

    private validate(createPurchaseRequest: CreatePurchaseRequest): void {
        // Regla de negocio: una compra debe tener monto positivo.
        if (createPurchaseRequest.amount.lessThanOrEqualTo(0)) {
            throw new InvalidPurchaseAmountError(
                createPurchaseRequest.amount.toFixed(2)
            );
        }
    }

    private validateAvailableCredit(
        userId: string,
        creditToReserve: Money,
        creditLine: CreditLine
    ): void {
        // La primera cuota se paga al momento; solo las cuotas pendientes consumen crédito.
        if (creditToReserve.amount.greaterThan(creditLine.availableCredit.amount)) {
            throw new InsufficientCreditError(userId);
        }
    }

    private async findCreditLineByUserId(
        creditLineRepository: CreditLineRepository,
        userId: string
    ): Promise<CreditLine> {
        const creditLine: CreditLine | null =
            await creditLineRepository.findCreditLineByUserId(userId);

        if (creditLine === null) {
            throw new CreditLineNotFoundError(userId);
        }

        return creditLine;
    }

    // Centralizamos la creación de Money porque hoy usamos moneda local fija,
    // pero mañana la moneda podría resolverse por país, usuario o línea de crédito.
    private createPurchaseAmount(
        createPurchaseRequest: CreatePurchaseRequest
    ): Money {
        return {
            amount: createPurchaseRequest.amount,
            currency: Currency.VES
        };
    }

    private createPurchase(
        createPurchaseRequest: CreatePurchaseRequest,
        purchaseAmount: Money,
        installmentPlan: Installment[],
        purchaseDate: Date
    ): Purchase {
        return {
            purchaseId: this.purchaseIdGenerator.nextPurchaseId(),
            userId: createPurchaseRequest.userId,
            amount: purchaseAmount,
            installments: createPurchaseRequest.installments,
            installmentPlan,
            status: PurchaseStatus.ACTIVE,
            createdAt: purchaseDate,
            updatedAt: purchaseDate
        };
    }

    private async reserveCredit(
        creditLineRepository: CreditLineRepository,
        creditLine: CreditLine,
        creditToReserve: Money,
        purchaseDate: Date
    ): Promise<void> {
        const updatedCreditLine: CreditLine = {
            ...creditLine,
            availableCredit: {
                ...creditLine.availableCredit,
                amount: creditLine.availableCredit.amount.minus(creditToReserve.amount)
            },
            updatedAt: purchaseDate
        };

        await creditLineRepository.save(updatedCreditLine);
    }

    private toResponse(purchase: Purchase): CreatePurchaseResponse {
        return {
            purchaseId: purchase.purchaseId,
            userId: purchase.userId,
            amount: {
                amount: purchase.amount.amount.toFixed(2),
                currency: purchase.amount.currency
            },
            installments: purchase.installments
        };
    }
}
