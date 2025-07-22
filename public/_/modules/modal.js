/**
 * A class for modal window and toast notification popup initialization.
 *
 * @since 1.0.0
 *
 */
export class Modal {

    constructor() {

        // render modal
        this.view();
    }

    /**
     * Render HTML to index.html
     */
    view() {

        // Check if modal already exists in the document
        if (!document.querySelector('.modal')) {
            // Create modal container
            const modal = document.createElement('div');

            // Set the HTML content
            modal.innerHTML = `
                <!-- Full screen modal -->
                <div class="modal modal-item" tabindex="-1">
                    <div class="modal-dialog ">
                        <div class="modal-content">
                            <div class="modal-header border-0">
                                <h5 class="modal-title"></h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close" tabindex="-1"></button>
                            </div>
                            <div class="modal-body">
                            
                            </div>
                            <div class="modal-footer border-0">

                            </div>
                        </div>
                    </div>
                </div>

                <div class="position-fixed bottom-0 p-2 m-4 start-0 align-items-center toast-cont">
                    <div class="toast hide align-items-center text-white bg-dark border-0" role="alert" aria-live="assertive" aria-atomic="true" data-bs-delay="3000">
                        <div class="d-flex">
                            <div class="toast-body"></div>
                            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
                        </div>
                    </div>
                </div>
                `;

            // Append to body
            document.body.appendChild(modal);
        }
    }
}