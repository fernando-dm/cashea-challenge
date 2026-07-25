import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";
import type { CreatePurchaseRequest } from "../../src/application/dto/request/create-purchase-request";
import type { CreatePurchaseResponse } from "../../src/application/dto/response/create-purchase-response";
import { CreditLineNotFoundError } from "../../src/application/exception/credit-line-not-found-error";
import { InsufficientCreditError } from "../../src/application/exception/insufficient-credit-error";
import { InvalidInstallmentPlanError } from "../../src/application/exception/invalid-installment-plan-error";
import { InvalidPurchaseAmountError } from "../../src/application/exception/invalid-purchase-amount-error";
import { CreatePurchaseCommandService } from "../../src/application/service/create-purchase-command-service";
import type { PurchaseIdGenerator } from "../../src/application/gateway/purchase-id-generator";
import type {
    TransactionalRepositories,
    TransactionManager
} from "../../src/application/transaction/transaction-manager";
import type { CreditLine } from "../../src/domain/model/credit-line";
import { InstallmentStatus } from "../../src/domain/model/installment";
import { Currency } from "../../src/domain/model/money";
import type { Purchase } from "../../src/domain/model/purchase";
import type { CreditLineRepository } from "../../src/domain/repository/credit-line-repository";
import type { PurchaseRepository } from "../../src/domain/repository/purchase-repository";
import { PurchaseFinancingPlanCreator } from "../../src/application/service/purchase-financing-plan-creator";

class FakeCreditLineRepository implements CreditLineRepository {
    public savedCreditLine: CreditLine | null;

    constructor(private readonly creditLine: CreditLine | null) {
        this.savedCreditLine = null;
    }

    async findCreditLineByUserId(_userId: string): Promise<CreditLine | null> {
        return this.creditLine;
    }

    async save(creditLine: CreditLine): Promise<CreditLine> {
        this.savedCreditLine = creditLine;

        return creditLine;
    }
}

class FakePurchaseRepository implements PurchaseRepository {
    public savedPurchase: Purchase | null;

    constructor() {
        this.savedPurchase = null;
    }

    async save(purchase: Purchase): Promise<Purchase> {
        this.savedPurchase = purchase;

        return purchase;
    }

    async findPurchaseById(_purchaseId: string): Promise<Purchase | null> {
        return this.savedPurchase;
    }

    async findPurchasesByUserId(_userId: string): Promise<Purchase[]> {
        return this.savedPurchase === null ? [] : [this.savedPurchase];
    }
}

class FakeTransactionManager implements TransactionManager {
    constructor(
        private readonly creditLineRepository: CreditLineRepository,
        private readonly purchaseRepository: PurchaseRepository
    ) {}

    async execute<T>(
        operation: (repositories: TransactionalRepositories) => Promise<T>
    ): Promise<T> {
        return operation({
            creditLineRepository: this.creditLineRepository,
            purchaseRepository: this.purchaseRepository
        });
    }
}

class FakePurchaseIdGenerator implements PurchaseIdGenerator {
    nextPurchaseId(): string {
        return "purchase-1";
    }
}

function buildCreatePurchaseCommandService(
    creditLineRepository: CreditLineRepository,
    purchaseRepository: PurchaseRepository = new FakePurchaseRepository()
): CreatePurchaseCommandService {
    const purchaseIdGenerator: PurchaseIdGenerator = new FakePurchaseIdGenerator();
    const purchaseFinancingPlanCreator: PurchaseFinancingPlanCreator =
        new PurchaseFinancingPlanCreator();
    const transactionManager: TransactionManager = new FakeTransactionManager(
        creditLineRepository,
        purchaseRepository
    );

    return new CreatePurchaseCommandService(
        transactionManager,
        purchaseIdGenerator,
        purchaseFinancingPlanCreator
    );
}

function createCreditLine(availableCreditAmount: string): CreditLine {
    const updatedAt: Date = new Date("2026-01-01T00:00:00.000Z");

    return {
        userId: "user-1",
        creditLimit: {
            amount: new Decimal("100000.00"),
            currency: Currency.VES
        },
        availableCredit: {
            amount: new Decimal(availableCreditAmount),
            currency: Currency.VES
        },
        updatedAt
    };
}

describe("CreatePurchaseCommandService", () => {
    it("accepts an allowed installment plan", async () => {
        // given
        const creditLineRepository: CreditLineRepository =
            new FakeCreditLineRepository(createCreditLine("100000.00"));
        const createPurchaseCommandService: CreatePurchaseCommandService =
            buildCreatePurchaseCommandService(creditLineRepository);
        const createPurchaseRequest: CreatePurchaseRequest = {
            userId: "user-1",
            amount: new Decimal("300.50"),
            installments: 3
        };

        // when
        const createPurchaseResponse: CreatePurchaseResponse =
            await createPurchaseCommandService.execute(createPurchaseRequest);

        // then
        expect(createPurchaseResponse.installments).toBe(3);
        expect(createPurchaseResponse.amount.amount).toBe("300.50");
    });

    it("throws InvalidInstallmentPlanError when installments are not allowed by the financing plan", async () => {
        // given
        const creditLineRepository: CreditLineRepository =
            new FakeCreditLineRepository(createCreditLine("100000.00"));
        const createPurchaseCommandService: CreatePurchaseCommandService =
            buildCreatePurchaseCommandService(creditLineRepository);
        const createPurchaseRequest: CreatePurchaseRequest = {
            userId: "user-1",
            amount: new Decimal("300.00"),
            installments: 5
        };

        // when / then
        await expect(
            createPurchaseCommandService.execute(createPurchaseRequest)
        ).rejects.toThrow(InvalidInstallmentPlanError);
    });

    it("throws InvalidPurchaseAmountError when amount is zero", async () => {
        // given
        const creditLineRepository: CreditLineRepository =
            new FakeCreditLineRepository(createCreditLine("100000.00"));
        const createPurchaseCommandService: CreatePurchaseCommandService =
            buildCreatePurchaseCommandService(creditLineRepository);
        const createPurchaseRequest: CreatePurchaseRequest = {
            userId: "user-1",
            amount: new Decimal("0.00"),
            installments: 3
        };

        // when / then
        await expect(
            createPurchaseCommandService.execute(createPurchaseRequest)
        ).rejects.toThrow(InvalidPurchaseAmountError);
    });

    it("throws InvalidPurchaseAmountError when amount is negative", async () => {
        // given
        const creditLineRepository: CreditLineRepository =
            new FakeCreditLineRepository(createCreditLine("100000.00"));
        const createPurchaseCommandService: CreatePurchaseCommandService =
            buildCreatePurchaseCommandService(creditLineRepository);
        const createPurchaseRequest: CreatePurchaseRequest = {
            userId: "user-1",
            amount: new Decimal("-100.00"),
            installments: 3
        };

        // when / then
        await expect(
            createPurchaseCommandService.execute(createPurchaseRequest)
        ).rejects.toThrow(InvalidPurchaseAmountError);
    });

    it("accepts an amount with cents", async () => {
        // given
        const creditLineRepository: CreditLineRepository =
            new FakeCreditLineRepository(createCreditLine("100000.00"));
        const createPurchaseCommandService: CreatePurchaseCommandService =
            buildCreatePurchaseCommandService(creditLineRepository);
        const createPurchaseRequest: CreatePurchaseRequest = {
            userId: "user-1",
            amount: new Decimal("100.50"),
            installments: 3
        };

        // when
        const createPurchaseResponse: CreatePurchaseResponse =
            await createPurchaseCommandService.execute(createPurchaseRequest);

        // then
        expect(createPurchaseResponse.amount.amount).toBe("100.50");
    });

    it("throws InsufficientCreditError when amount exceeds available credit", async () => {
        // given
        const creditLineRepository: CreditLineRepository =
            new FakeCreditLineRepository(createCreditLine("100.00"));
        const createPurchaseCommandService: CreatePurchaseCommandService =
            buildCreatePurchaseCommandService(creditLineRepository);
        const createPurchaseRequest: CreatePurchaseRequest = {
            userId: "user-1",
            amount: new Decimal("300.00"),
            installments: 3
        };

        // when / then
        await expect(
            createPurchaseCommandService.execute(createPurchaseRequest)
        ).rejects.toThrow(InsufficientCreditError);
    });

    it("throws CreditLineNotFoundError when the user has no approved credit line", async () => {
        // given
        const creditLineRepository: CreditLineRepository =
            new FakeCreditLineRepository(null);
        const createPurchaseCommandService: CreatePurchaseCommandService =
            buildCreatePurchaseCommandService(creditLineRepository);
        const createPurchaseRequest: CreatePurchaseRequest = {
            userId: "unknown-user",
            amount: new Decimal("300.00"),
            installments: 3
        };

        // when / then
        await expect(
            createPurchaseCommandService.execute(createPurchaseRequest)
        ).rejects.toThrow(CreditLineNotFoundError);
    });

    it("saves the purchase and reserves only pending installments credit", async () => {
        // given
        const creditLineRepository: FakeCreditLineRepository =
            new FakeCreditLineRepository(createCreditLine("1000.00"));
        const purchaseRepository: FakePurchaseRepository = new FakePurchaseRepository();
        const createPurchaseCommandService: CreatePurchaseCommandService =
            buildCreatePurchaseCommandService(creditLineRepository, purchaseRepository);
        const createPurchaseRequest: CreatePurchaseRequest = {
            userId: "user-1",
            amount: new Decimal("900.00"),
            installments: 3
        };

        // when
        await createPurchaseCommandService.execute(createPurchaseRequest);

        // then
        expect(purchaseRepository.savedPurchase?.purchaseId).toBe("purchase-1");
        expect(purchaseRepository.savedPurchase?.installmentPlan).toHaveLength(3);
        expect(purchaseRepository.savedPurchase?.installmentPlan[0].status)
            .toBe(InstallmentStatus.PAID);
        expect(purchaseRepository.savedPurchase?.installmentPlan[1].status)
            .toBe(InstallmentStatus.PENDING);
        expect(purchaseRepository.savedPurchase?.installmentPlan[2].status)
            .toBe(InstallmentStatus.PENDING);
        expect(purchaseRepository.savedPurchase?.createdAt).toBeInstanceOf(Date);
        expect(purchaseRepository.savedPurchase?.updatedAt).toBeInstanceOf(Date);
        expect(creditLineRepository.savedCreditLine?.availableCredit.amount.toFixed(2))
            .toBe("400.00");
        expect(creditLineRepository.savedCreditLine?.updatedAt).toBeInstanceOf(Date);
    });
});
