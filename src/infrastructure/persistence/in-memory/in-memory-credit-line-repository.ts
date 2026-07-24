import type { CreditLine } from "../../../domain/model/credit-line";
import { Currency } from "../../../domain/model/money";
import type { CreditLineRepository } from "../../../domain/repository/credit-line-repository";

export class InMemoryCreditLineRepository implements CreditLineRepository {
    private readonly creditLinesByUserId: Map<string, CreditLine>;

    constructor() {
        this.creditLinesByUserId = new Map<string, CreditLine>([
            [
                "user-1",
                {
                    userId: "user-1",
                    creditLimit: {
                        amount: 100000,
                        currency: Currency.VES
                    },
                    availableCredit: {
                        amount: 100000,
                        currency: Currency.VES
                    }
                }
            ],
            [
                "user-without-credit",
                {
                    userId: "user-without-credit",
                    creditLimit: {
                        amount: 100000,
                        currency: Currency.VES
                    },
                    availableCredit: {
                        amount: 0,
                        currency: Currency.VES
                    }
                }
            ]
        ]);
    }

    findCreditLineByUserId(userId: string): CreditLine | null {
        const creditLine: CreditLine | undefined =
            this.creditLinesByUserId.get(userId);

        return creditLine ?? null;
    }
}
