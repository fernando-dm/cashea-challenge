const state = {
    userId: "user-with-1000-credit",
    creditLine: null,
    preview: null,
    purchases: [],
    lastPurchase: null,
    lastPurchaseDetail: null,
    loading: false
};

const userIdInput = document.querySelector("#user-id");
const loadCreditLineButton = document.querySelector("#load-credit-line");
const creditLineSection = document.querySelector("#credit-line");
const amountInput = document.querySelector("#amount");
const installmentsSelect = document.querySelector("#installments");
const previewButton = document.querySelector("#preview-purchase");
const confirmButton = document.querySelector("#confirm-purchase");
const loadPurchasesButton = document.querySelector("#load-purchases");
const purchasesSection = document.querySelector("#purchases");
const previewSection = document.querySelector("#preview");
const resultSection = document.querySelector("#result");
const purchaseDetailSection = document.querySelector("#purchase-detail");

userIdInput.value = state.userId;

loadCreditLineButton.addEventListener("click", loadCreditLine);
previewButton.addEventListener("click", previewPurchase);
confirmButton.addEventListener("click", confirmPurchase);
loadPurchasesButton.addEventListener("click", loadPurchases);
userIdInput.addEventListener("input", clearUserStateAndMessage);
amountInput.addEventListener("input", clearPreview);
installmentsSelect.addEventListener("change", clearPreview);
purchasesSection.addEventListener("click", (event) => {
    const detailButton = event.target.closest("[data-purchase-id]");

    if (detailButton === null) {
        return;
    }

    loadPurchaseDetail(detailButton.dataset.purchaseId);
});

loadCreditLine();

async function loadCreditLine() {
    state.userId = userIdInput.value.trim();

    if (state.userId.length === 0) {
        showError("Ingresá un user id para consultar la línea de crédito.");
        return;
    }

    await runWithLoading(
        async () => {
            state.creditLine = await getCreditLine(state.userId);
            state.preview = null;
            state.purchases = [];
            state.lastPurchase = null;
            state.lastPurchaseDetail = null;

            renderCreditLine();
            renderPreview();
            renderPurchases();
            renderPurchaseDetail();
            showSuccess("Línea de crédito actualizada.");
        },
        clearUserState
    );
}

async function previewPurchase() {
    clearMessage();

    const purchaseAmount = parseAmount(amountInput.value);
    const installments = Number(installmentsSelect.value);

    if (purchaseAmount <= 0) {
        showError("Ingresá un monto mayor a cero.");
        return;
    }

    if (state.creditLine === null) {
        showError("Primero consultá la línea de crédito.");
        return;
    }

    await runWithLoading(async () => {
        state.preview = await previewPurchasePlan(
            state.userId,
            purchaseAmount,
            installments
        );

        renderPreview();

        if (!state.preview.canBeConfirmed) {
            showError("El monto excede tu disponible.");
            return;
        }

        showSuccess("Plan simulado. Si está todo ok, confirmá la compra.");
    });
}

async function confirmPurchase() {
    if (state.preview === null) {
        showError("Primero simulá el plan de cuotas.");
        return;
    }

    if (!state.preview.canBeConfirmed) {
        showError("El monto excede tu disponible.");
        return;
    }

    await runWithLoading(async () => {
        // Después de confirmar, consultamos el detalle persistido.
        // Así mostramos la verdad del backend: estado de compra, cuotas y primera cuota pagada.
        state.lastPurchase = await createPurchase(
            state.userId,
            state.preview.amount.amount,
            state.preview.installments
        );
        state.lastPurchaseDetail = await getPurchaseDetail(
            state.lastPurchase.purchaseId
        );
        state.purchases = await getPurchases(state.userId);
        state.creditLine = await getCreditLine(state.userId);
        state.preview = null;
        amountInput.value = "";

        renderCreditLine();
        renderPreview();
        renderPurchases();
        renderPurchaseDetail();
        showSuccess(
            `Compra confirmada: ${state.lastPurchase.purchaseId}. ` +
            "El disponible fue actualizado."
        );
    });
}

async function payPendingInstallment(purchaseId, installmentNumber) {
    await runWithLoading(async () => {
        // Después de pagar, refrescamos desde backend para mostrar el estado persistido.
        // Esto evita marcar cuotas como pagadas solo en memoria del navegador.
        const paymentResult = await payInstallment(purchaseId, installmentNumber);
        state.lastPurchaseDetail = await getPurchaseDetail(purchaseId);
        state.creditLine = await getCreditLine(state.lastPurchaseDetail.userId);
        state.purchases = await getPurchases(state.lastPurchaseDetail.userId);

        renderCreditLine();
        renderPurchases();
        renderPurchaseDetail();
        showSuccess(
            `Cuota ${paymentResult.installmentNumber} pagada. ` +
            `Crédito recuperado: ${paymentResult.recoveredCredit.amount} ` +
            `${paymentResult.recoveredCredit.currency}.`
        );
    });
}

async function loadPurchases() {
    state.userId = userIdInput.value.trim();

    if (state.userId.length === 0) {
        showError("Ingresá un user id para consultar sus compras.");
        return;
    }

    await runWithLoading(async () => {
        // El listado permite elegir una compra existente sin conocer su id de antemano.
        state.purchases = await getPurchases(state.userId);
        state.creditLine = await getCreditLine(state.userId);

        renderCreditLine();
        renderPurchases();
        showSuccess("Compras cargadas. Elegí una para ver su detalle.");
    });
}

async function loadPurchaseDetail(purchaseId) {
    await runWithLoading(async () => {
        // El detalle sigue usando su endpoint específico para mantener responsabilidades separadas.
        state.lastPurchaseDetail = await getPurchaseDetail(purchaseId);
        state.userId = state.lastPurchaseDetail.userId;
        userIdInput.value = state.userId;
        state.creditLine = await getCreditLine(state.userId);
        state.preview = null;

        renderCreditLine();
        renderPreview();
        renderPurchaseDetail();
        showSuccess("Compra cargada. Podés pagar las cuotas pendientes.");
    });
}

async function getCreditLine(userId) {
    return getJson(`/users/${encodeURIComponent(userId)}/credit-line`);
}

async function getPurchases(userId) {
    return getJson(`/users/${encodeURIComponent(userId)}/purchases`);
}

async function previewPurchasePlan(userId, amount, installments) {
    // El preview se pide al backend para no duplicar reglas de cuotas en la UI.
    return postJson(`/users/${encodeURIComponent(userId)}/purchases/preview`, {
        amount: formatMoney(amount),
        installments
    });
}

async function getPurchaseDetail(purchaseId) {
    return getJson(`/purchases/${encodeURIComponent(purchaseId)}`);
}

async function payInstallment(purchaseId, installmentNumber) {
    return postJson(
        `/purchases/${encodeURIComponent(purchaseId)}` +
        `/installments/${encodeURIComponent(installmentNumber)}/pay`,
        {}
    );
}

async function createPurchase(userId, amount, installments) {
    return postJson(`/users/${encodeURIComponent(userId)}/purchases`, {
        amount: formatMoney(amount),
        installments
    });
}

async function getJson(url) {
    const response = await fetch(url);
    return parseApiResponse(response);
}

async function postJson(url, body) {
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    });

    return parseApiResponse(response);
}

async function parseApiResponse(response) {
    const responseBody = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(resolveErrorMessage(response.status, responseBody));
    }

    return responseBody;
}

function resolveErrorMessage(status, responseBody) {
    if (status === 409) {
        return responseBody.error === "Installment already paid"
            ? "La cuota ya está pagada."
            : "El monto excede tu disponible.";
    }

    if (status === 400 && responseBody.error === "Insufficient credit") {
        return "El monto excede tu disponible.";
    }

    if (status === 404) {
        return "No se encontró el usuario o recurso solicitado.";
    }

    if (status === 400) {
        return "Revisá el monto y la cantidad de cuotas.";
    }

    return responseBody.message || "No se pudo completar la operación.";
}

async function runWithLoading(operation, onError) {
    setLoading(true);

    try {
        await operation();
    } catch (error) {
        if (onError !== undefined) {
            onError();
        }

        showError(error.message);
    } finally {
        setLoading(false);
    }
}

function renderCreditLine() {
    if (state.creditLine === null) {
        creditLineSection.innerHTML = "<p>Consultá una línea de crédito para empezar.</p>";
        return;
    }

    creditLineSection.innerHTML = `
        <dl>
            <div>
                <dt>Usuario</dt>
                <dd>${escapeHtml(state.creditLine.userId)}</dd>
            </div>
            <div>
                <dt>Límite</dt>
                <dd>${formatMoneyText(state.creditLine.creditLimit)}</dd>
            </div>
            <div>
                <dt>Disponible</dt>
                <dd>${formatMoneyText(state.creditLine.availableCredit)}</dd>
            </div>
        </dl>
    `;
}

function renderPreview() {
    if (state.preview === null) {
        previewSection.innerHTML = "<p>Simulá una compra para ver el plan de cuotas.</p>";
        confirmButton.disabled = true;
        return;
    }

    const statusClass = state.preview.canBeConfirmed ? "success" : "warning";
    const statusText = state.preview.canBeConfirmed
        ? "Disponible suficiente"
        : "Excede el disponible";

    previewSection.innerHTML = `
        <dl>
            <div>
                <dt>Monto</dt>
                <dd>${formatMoneyText(state.preview.amount)}</dd>
            </div>
            <div>
                <dt>Cuotas</dt>
                <dd>${state.preview.installments}</dd>
            </div>
            <div>
                <dt>Disponible actual</dt>
                <dd>${formatMoneyText(state.preview.availableCredit)}</dd>
            </div>
            <div>
                <dt>Crédito a reservar</dt>
                <dd>${formatMoneyText(state.preview.creditToReserve)}</dd>
            </div>
        </dl>
            <p class="help-text">
              La primera cuota se paga al momento; solo las cuotas financiadas consumen crédito disponible.
            </p>
        <h3>Plan de cuotas</h3>
        <ol class="installments">
            ${state.preview.installmentPlan.map(renderPreviewInstallment).join("")}
        </ol>
        <p class="${statusClass}">${statusText}</p>
    `;

    confirmButton.disabled = !state.preview.canBeConfirmed;
}

function renderPurchases() {
    if (state.purchases.length === 0) {
        purchasesSection.classList.add("hidden");
        purchasesSection.innerHTML = "";
        return;
    }

    purchasesSection.classList.remove("hidden");
    purchasesSection.innerHTML = `
        <ol class="purchases-list">
            ${state.purchases.map(renderPurchaseSummary).join("")}
        </ol>
    `;
}

function renderPurchaseSummary(purchase) {
    return `
        <li>
            <span>${escapeHtml(purchase.purchaseId)}</span>
            <strong>${formatMoneyText(purchase.amount)}</strong>
            <small>${escapeHtml(purchase.status)}</small>
            <small>${escapeHtml(purchase.pendingInstallments)} pendientes</small>
            <button
                class="small-button"
                type="button"
                data-purchase-id="${escapeHtml(purchase.purchaseId)}"
            >
                Ver detalle
            </button>
        </li>
    `;
}


function renderPurchaseDetail() {
    if (state.lastPurchaseDetail === null) {
        purchaseDetailSection.classList.add("hidden");
        purchaseDetailSection.innerHTML = "";
        return;
    }

    // Este render usa el estado real persistido de las cuotas.
    // No recalcula reglas de negocio: solo traduce la respuesta del backend para lectura.
    purchaseDetailSection.classList.remove("hidden");
    purchaseDetailSection.innerHTML = `
        <h3>Detalle persistido</h3>
        <dl>
            <div>
                <dt>Compra</dt>
                <dd>${escapeHtml(state.lastPurchaseDetail.purchaseId)}</dd>
            </div>
            <div>
                <dt>Estado</dt>
                <dd>${escapeHtml(state.lastPurchaseDetail.status)}</dd>
            </div>
            <div>
                <dt>Monto</dt>
                <dd>${formatMoneyText(state.lastPurchaseDetail.amount)}</dd>
            </div>
        </dl>
        <h3>Cuotas reales</h3>
        <ol class="installments">
            ${state.lastPurchaseDetail.installmentPlan
                .map(renderPersistedInstallment)
                .join("")}
        </ol>
    `;
}

function showSuccess(message) {
    resultSection.innerHTML = `<p class="success">${escapeHtml(message)}</p>`;
}

function showError(message) {
    resultSection.innerHTML = `<p class="error">${escapeHtml(message)}</p>`;
}

function clearMessage() {
    resultSection.innerHTML = "";
}

function clearPreview() {
    state.preview = null;
    state.lastPurchaseDetail = null;
    renderPreview();
    renderPurchaseDetail();
    clearMessage();
}

function clearUserState() {
    state.creditLine = null;
    state.preview = null;
    state.purchases = [];
    state.lastPurchase = null;
    state.lastPurchaseDetail = null;

    renderCreditLine();
    renderPreview();
    renderPurchases();
    renderPurchaseDetail();
}

function clearUserStateAndMessage() {
    clearUserState();
    clearMessage();
}

function setLoading(isLoading) {
    state.loading = isLoading;

    loadCreditLineButton.disabled = isLoading;
    previewButton.disabled = isLoading;
    confirmButton.disabled = isLoading || state.preview === null ||
        !state.preview.canBeConfirmed;
    loadPurchasesButton.disabled = isLoading;
    purchasesSection
        .querySelectorAll("[data-purchase-id]")
        .forEach((detailButton) => {
            detailButton.disabled = isLoading;
        });
    purchaseDetailSection
        .querySelectorAll("[data-installment-number]")
        .forEach((payButton) => {
            payButton.disabled = isLoading;
        });

    document.body.classList.toggle("loading", isLoading);
}

function parseAmount(value) {
    const parsedAmount = Number(value);

    if (!Number.isFinite(parsedAmount)) {
        return 0;
    }

    return parsedAmount;
}

function roundMoney(value) {
    return Math.round(value * 100) / 100;
}

function formatMoney(value) {
    return roundMoney(value).toFixed(2);
}

function formatMoneyText(money) {
    return `${escapeHtml(money.amount)} ${escapeHtml(money.currency)}`;
}

function renderPreviewInstallment(installment) {
    const paymentTimingText = installment.paymentTiming === "PAID_AT_PURCHASE"
        ? "se paga al momento"
        : "queda financiada";

    return `
        <li>
            <span>Cuota ${escapeHtml(installment.installmentNumber)}</span>
            <strong>${formatMoneyText(installment.amount)}</strong>
            <small>${paymentTimingText}</small>
        </li>
    `;
}

function renderPersistedInstallment(installment) {
    const paymentStatusText = resolvePersistedInstallmentText(installment);
    const payButton = installment.status === "PENDING"
        ? renderPayInstallmentButton(installment)
        : "";

    return `
        <li>
            <span>Cuota ${escapeHtml(installment.installmentNumber)}</span>
            <strong>${formatMoneyText(installment.amount)}</strong>
            <small>${escapeHtml(installment.status)}</small>
            <small>${paymentStatusText}</small>
            ${payButton}
        </li>
    `;
}

function renderPayInstallmentButton(installment) {
    return `
        <button
            class="small-button"
            type="button"
            data-installment-number="${escapeHtml(installment.installmentNumber)}"
        >
            Pagar cuota
        </button>
    `;
}

function resolvePersistedInstallmentText(installment) {
    if (installment.installmentNumber === 1 && installment.status === "PAID") {
        return "pagada al momento";
    }

    if (installment.status === "PAID") {
        return "pagada";
    }

    return "pendiente";
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll("\"", "&quot;")
        .replaceAll("'", "&#039;");
}

purchaseDetailSection.addEventListener("click", (event) => {
    const payButton = event.target.closest("[data-installment-number]");

    if (payButton === null || state.lastPurchaseDetail === null) {
        return;
    }

    payPendingInstallment(
        state.lastPurchaseDetail.purchaseId,
        Number(payButton.dataset.installmentNumber)
    );
});
