import type { Express } from "express";
import request from "supertest";
import type { Response } from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";

describe("GET /users/:userId/credit-line", () => {
    it("returns the credit limit and available credit for an existing user", async () => {
        // given
        const app: Express = createApp();

        // when
        const response: Response = await request(app)
            .get("/users/user-1/credit-line")
            .expect(200);

        // then
        expect(response.body).toEqual({
            userId: "user-1",
            creditLimit: {
                amount: "100000.00",
                currency: "VES"
            },
            availableCredit: {
                amount: "100000.00",
                currency: "VES"
            }
        });
    });

    it("returns zero available credit when the user has no credit left", async () => {
        // given
        const app: Express = createApp();

        // when
        const response: Response = await request(app)
            .get("/users/user-without-credit/credit-line")
            .expect(200);

        // then
        expect(response.body).toEqual({
            userId: "user-without-credit",
            creditLimit: {
                amount: "100000.00",
                currency: "VES"
            },
            availableCredit: {
                amount: "0.00",
                currency: "VES"
            }
        });
    });

    it("returns 404 when the user has no approved credit line", async () => {
        // given
        const app: Express = createApp();

        // when
        const response: Response = await request(app)
            .get("/users/unknown-user/credit-line")
            .expect(404);

        // then
        expect(response.body).toEqual({
            error: "Credit line not found"
        });
    });
});
