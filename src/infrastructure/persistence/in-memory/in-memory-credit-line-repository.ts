import Decimal from "decimal.js";
import type { CreditLine } from "../../../domain/model/credit-line";
import { Currency } from "../../../domain/model/money";
import type { CreditLineRepository } from "../../../domain/repository/credit-line-repository";

export class InMemoryCreditLineRepository implements CreditLineRepository {
    private readonly creditLinesByUserId: Map<string, CreditLine>;

    constructor() {
        const seededAt: Date = new Date("2026-01-01T00:00:00.000Z");

        this.creditLinesByUserId = new Map<string, CreditLine>([
            [
                "user-1",
                {
                    userId: "user-1",
                    creditLimit: {
                        amount: new Decimal("100000.00"),
                        currency: Currency.VES
                    },
                    availableCredit: {
                        amount: new Decimal("100000.00"),
                        currency: Currency.VES
                    },
                    updatedAt: seededAt
                }
            ],
            [
                "user-with-1000-credit",
                {
                    userId: "user-with-1000-credit",
                    creditLimit: {
                        amount: new Decimal("1000.00"),
                        currency: Currency.VES
                    },
                    availableCredit: {
                        amount: new Decimal("1000.00"),
                        currency: Currency.VES
                    },
                    updatedAt: seededAt
                }
            ],
            [
                "user-with-limited-credit",
                {
                    userId: "user-with-limited-credit",
                    creditLimit: {
                        amount: new Decimal("100000.00"),
                        currency: Currency.VES
                    },
                    availableCredit: {
                        amount: new Decimal("100.00"),
                        currency: Currency.VES
                    },
                    updatedAt: seededAt
                }
            ],
            [
                "user-without-credit",
                {
                    userId: "user-without-credit",
                    creditLimit: {
                        amount: new Decimal("100000.00"),
                        currency: Currency.VES
                    },
                    availableCredit: {
                        amount: new Decimal("0.00"),
                        currency: Currency.VES
                    },
                    updatedAt: seededAt
                }
            ]
        ]);
    }

    findCreditLineByUserId(userId: string): CreditLine | null {
        const creditLine: CreditLine | undefined =
            this.creditLinesByUserId.get(userId);

        return creditLine ?? null;
    }

    save(creditLine: CreditLine): CreditLine {
        this.creditLinesByUserId.set(creditLine.userId, creditLine);

        return creditLine;
    }
}
