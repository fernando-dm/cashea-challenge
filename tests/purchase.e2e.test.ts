import type { Express } from "express";
import request from "supertest";
import type { Response } from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";

describe("POST /users/:userId/purchases", () => {
    it("creates a purchase contract for a user", async () => {
        // given
        const app: Express = createApp();

        // when
        const response: Response = await request(app)
            .post("/users/user-1/purchases")
            .send({
                amount: "300.50",
                installments: 3
            })
            .expect(201);

        // then
        expect(response.body).toEqual({
            purchaseId: "purchase-1",
            userId: "user-1",
            amount: {
                amount: "300.50",
                currency: "VES"
            },
            installments: 3
        });
    });

    it("returns 400 when installments are not allowed", async () => {
        // given
        const app: Express = createApp();

        // when
        const response: Response = await request(app)
            .post("/users/user-1/purchases")
            .send({
                amount: "300.00",
                installments: 5
            })
            .expect(400);

        // then
        expect(response.body).toEqual({
            error: "Invalid installment plan"
        });
    });

    it("returns 400 when amount is not a valid purchase amount", async () => {
        // given
        const app: Express = createApp();

        // when
        const response: Response = await request(app)
            .post("/users/user-1/purchases")
            .send({
                amount: "0",
                installments: 3
            })
            .expect(400);

        // then
        expect(response.body).toEqual({
            error: "Invalid purchase amount"
        });
    });

    it("returns 400 when amount has more than two decimal digits", async () => {
        // given
        const app: Express = createApp();

        // when
        const response: Response = await request(app)
            .post("/users/user-1/purchases")
            .send({
                amount: "300.555",
                installments: 3
            })
            .expect(400);

        // then
        expect(response.body).toEqual({
            error: "Invalid purchase amount"
        });
    });

    it("returns 400 when purchase amount exceeds available credit", async () => {
        // given
        const app: Express = createApp();

        // when
        const response: Response = await request(app)
            .post("/users/user-with-limited-credit/purchases")
            .send({
                amount: "300.00",
                installments: 3
            })
            .expect(400);

        // then
        expect(response.body).toEqual({
            error: "Insufficient credit"
        });
    });

    it("returns 404 when the user has no approved credit line", async () => {
        // given
        const app: Express = createApp();

        // when
        const response: Response = await request(app)
            .post("/users/unknown-user/purchases")
            .send({
                amount: "300.00",
                installments: 3
            })
            .expect(404);

        // then
        expect(response.body).toEqual({
            error: "Credit line not found"
        });
    });

    it("updates available credit using only pending installments", async () => {
        // given
        const app: Express = createApp();

        // when
        await request(app)
            .post("/users/user-with-1000-credit/purchases")
            .send({
                amount: "900.00",
                installments: 3
            })
            .expect(201);

        const response: Response = await request(app)
            .get("/users/user-with-1000-credit/credit-line")
            .expect(200);

        // then
        expect(response.body.availableCredit).toEqual({
            amount: "400.00",
            currency: "VES"
        });
    });
});

describe("GET /purchases/:purchaseId", () => {
    it("returns purchase detail with installment plan", async () => {
        // given
        const app: Express = createApp();

        await request(app)
            .post("/users/user-with-1000-credit/purchases")
            .send({
                amount: "900.00",
                installments: 3
            })
            .expect(201);

        // when
        const response: Response = await request(app)
            .get("/purchases/purchase-1")
            .expect(200);

        // then
        expect(response.body.purchaseId).toBe("purchase-1");
        expect(response.body.userId).toBe("user-with-1000-credit");
        expect(response.body.amount).toEqual({
            amount: "900.00",
            currency: "VES"
        });
        expect(response.body.status).toBe("ACTIVE");
        expect(response.body.installmentPlan).toHaveLength(3);
        expect(response.body.installmentPlan[0].status).toBe("PAID");
        expect(response.body.installmentPlan[1].status).toBe("PENDING");
        expect(response.body.installmentPlan[2].status).toBe("PENDING");
    });

    it("returns 404 when purchase does not exist", async () => {
        // given
        const app: Express = createApp();

        // when
        const response: Response = await request(app)
            .get("/purchases/unknown-purchase")
            .expect(404);

        // then
        expect(response.body).toEqual({
            error: "Purchase not found"
        });
    });
});
