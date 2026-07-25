import type { CreditLine } from "../model/credit-line";

export interface CreditLineRepository {
    findCreditLineByUserId(userId: string): Promise<CreditLine | null>;
    save(creditLine: CreditLine): Promise<CreditLine>;
}
