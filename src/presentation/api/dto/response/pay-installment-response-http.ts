import type { Response } from "express";
import type { PayInstallmentResponse } from "../../../../application/dto/response/pay-installment-response";

export type PayInstallmentResponseHttp = Response<PayInstallmentResponse>;
