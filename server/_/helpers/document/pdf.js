const escapeHtml = (value = "") => String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/**
 * Shared Playwright PDF options with footer pagination.
 */
export const getPaginatedPdfOptions = (path, footerLabel = "Page", margin = {}) => {

    const top = margin.top || "10mm";
    const bottom = margin.bottom || "16mm";
    const left = margin.left || "15mm";
    const right = margin.right || "15mm";
    const safeLabel = escapeHtml(footerLabel);

    return {
        path,
        format: "A4",
        printBackground: true,
        displayHeaderFooter: true,
        margin: { top, bottom, left, right },
        headerTemplate: `<div></div>`,
        footerTemplate: `
            <div style="width:100%;font-size:8px;color:#666;padding:0 16mm 4mm 16mm;text-align:right;">
                ${safeLabel} <span class="pageNumber"></span> / <span class="totalPages"></span>
            </div>
        `
    };
};
