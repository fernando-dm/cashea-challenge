import type { CreditLineResponse } from "../dto/response/credit-line-response";
import { CreditLineNotFoundError } from "../exception/credit-line-not-found-error";
import { InvalidUserIdError } from "../exception/invalid-user-id-error";
import type { CreditLine } from "../../domain/model/credit-line";
import type { CreditLineRepository } from "../../domain/repository/credit-line-repository";

export class GetCreditLineByUserIdQueryService {
    constructor(private readonly creditLineRepository: CreditLineRepository) {}

    async execute(userId: string): Promise<CreditLineResponse> {
        this.validate(userId);

        const creditLine: CreditLine = await this.findCreditLineByUserId(userId);

        return this.toResponse(creditLine);
    }

    private validate(userId: string): void {
        if (userId.trim().length === 0) {
            throw new InvalidUserIdError();
        }
    }

    private async findCreditLineByUserId(userId: string): Promise<CreditLine> {
        const creditLine: CreditLine | null =
            await this.creditLineRepository.findCreditLineByUserId(userId);

        if (creditLine === null) {
            throw new CreditLineNotFoundError(userId);
        }

        return creditLine;
    }

    private toResponse(creditLine: CreditLine): CreditLineResponse {
        return {
            userId: creditLine.userId,
            creditLimit: {
                amount: creditLine.creditLimit.amount.toFixed(2),
                currency: creditLine.creditLimit.currency
            },
            availableCredit: {
                amount: creditLine.availableCredit.amount.toFixed(2),
                currency: creditLine.availableCredit.currency
            }
        };
    }
}
