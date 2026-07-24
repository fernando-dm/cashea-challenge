import type { CreditLine } from "../model/credit-line";

export interface CreditLineRepository {
    findCreditLineByUserId(userId: string): CreditLine | null;
}
