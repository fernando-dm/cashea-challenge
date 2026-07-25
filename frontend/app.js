const state = {
    userId: "user-with-1000-credit",
    creditLine: null,
    preview: null,
    lastPurchase: null,
    loading: false
};

const userIdInput = document.querySelector("#user-id");
const loadCreditLineButton = document.querySelector("#load-credit-line");
const creditLineSection = document.querySelector("#credit-line");
const amountInput = document.querySelector("#amount");
const installmentsSelect = document.querySelector("#installments");
const previewButton = document.querySelector("#preview-purchase");
const confirmButton = document.querySelector("#confirm-purchase");
const previewSection = document.querySelector("#preview");
const resultSection = document.querySelector("#result");

userIdInput.value = state.userId;

loadCreditLineButton.addEventListener("click", loadCreditLine);
previewButton.addEventListener("click", previewPurchase);
confirmButton.addEventListener("click", confirmPurchase);

loadCreditLine();

async function loadCreditLine() {
    state.userId = userIdInput.value.trim();

    if (state.userId.length === 0) {
        showError("Ingresá un user id para consultar la línea de crédito.");
        return;
    }

    await runWithLoading(async () => {
        state.creditLine = await getCreditLine(state.userId);
        state.preview = null;
        state.lastPurchase = null;

        renderCreditLine();
        renderPreview();
        showSuccess("Línea de crédito actualizada.");
    });
}

function previewPurchase() {
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

    const installmentAmount = roundMoney(purchaseAmount / installments);
    const creditToReserve = roundMoney(purchaseAmount - installmentAmount);
    const availableCredit = parseAmount(state.creditLine.availableCredit.amount);

    state.preview = {
        amount: purchaseAmount,
        installments,
        installmentAmount,
        creditToReserve,
        exceedsAvailableCredit: creditToReserve > availableCredit
    };

    renderPreview();

    if (state.preview.exceedsAvailableCredit) {
        showError("El monto excede tu disponible.");
        return;
    }

    showSuccess("Plan simulado. Si está todo ok, confirmá la compra.");
}

async function confirmPurchase() {
    if (state.preview === null) {
        previewPurchase();
    }

    if (state.preview === null || state.preview.exceedsAvailableCredit) {
        return;
    }

    await runWithLoading(async () => {
        state.lastPurchase = await createPurchase(
            state.userId,
            state.preview.amount,
            state.preview.installments
        );
        state.creditLine = await getCreditLine(state.userId);
        state.preview = null;
        amountInput.value = "";

        renderCreditLine();
        renderPreview();
        renderPurchaseCreated();
        showSuccess("Compra confirmada. El disponible fue actualizado.");
    });
}

async function getCreditLine(userId) {
    return getJson(`/users/${encodeURIComponent(userId)}/credit-line`);
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

async function runWithLoading(operation) {
    setLoading(true);

    try {
        await operation();
    } catch (error) {
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

    const statusClass = state.preview.exceedsAvailableCredit ? "warning" : "success";
    const statusText = state.preview.exceedsAvailableCredit
        ? "Excede el disponible"
        : "Disponible suficiente";

    previewSection.innerHTML = `
        <dl>
            <div>
                <dt>Monto</dt>
                <dd>${formatMoney(state.preview.amount)} VES</dd>
            </div>
            <div>
                <dt>Cuotas</dt>
                <dd>${state.preview.installments}</dd>
            </div>
            <div>
                <dt>Valor estimado por cuota</dt>
                <dd>${formatMoney(state.preview.installmentAmount)} VES</dd>
            </div>
            <div>
                <dt>Crédito a reservar</dt>
                <dd>${formatMoney(state.preview.creditToReserve)} VES</dd>
            </div>
        </dl>
        <p class="${statusClass}">${statusText}</p>
    `;

    confirmButton.disabled = state.preview.exceedsAvailableCredit;
}

function renderPurchaseCreated() {
    if (state.lastPurchase === null) {
        return;
    }

    resultSection.innerHTML = `
        <p class="success">Compra creada: ${escapeHtml(state.lastPurchase.purchaseId)}</p>
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

function setLoading(isLoading) {
    state.loading = isLoading;

    loadCreditLineButton.disabled = isLoading;
    previewButton.disabled = isLoading;
    confirmButton.disabled = isLoading || state.preview === null ||
        state.preview.exceedsAvailableCredit;

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

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll("\"", "&quot;")
        .replaceAll("'", "&#039;");
}
