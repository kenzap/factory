export const focusEditorField = (input, { selectAll = true } = {}) => {
    const applyFocus = () => {
        if (!input || !input.isConnected) return;

        try {
            input.focus({ preventScroll: true });
        } catch (error) {
            input.focus();
        }

        const valueLength = String(input.value || "").length;

        if (selectAll) {
            try {
                if (typeof input.setSelectionRange === "function") {
                    input.setSelectionRange(0, valueLength);
                    return;
                }
            } catch (error) {
                // Fall through to select() for input types that do not support setSelectionRange.
            }

            try {
                if (typeof input.select === "function") {
                    input.select();
                }
            } catch (error) {
                // Some input types do not support select(); keeping focus is still useful.
            }

            return;
        }

        try {
            if (typeof input.setSelectionRange === "function") {
                input.setSelectionRange(valueLength, valueLength);
            }
        } catch (error) {
            // Not all editable fields expose caret APIs.
        }
    };

    if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
        window.requestAnimationFrame(() => {
            window.requestAnimationFrame(applyFocus);
        });
        return;
    }

    setTimeout(applyFocus, 0);
};
