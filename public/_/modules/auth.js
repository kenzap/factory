import { getOTP } from "/_/api/auth_get_otp.js";
import { validateOTP } from "/_/api/auth_validate_otp.js";
import { __html, onClick, validateEmail } from "/_/helpers/global.js";
import { Modal } from "/_/modules/modal.js";

export class Auth {

    constructor() {

        this.email = localStorage.getItem('otp-email') || '';
        this.resendTimes = parseInt(localStorage.getItem('otp-resend-times')) || 0;
        this.resendLast = parseInt(localStorage.getItem('otp-resend-last')) || Math.floor(Date.now() / 1000);

        this.init();
    }

    init = () => {

        this.view();
    }

    view = () => {

        let self = this;

        // Check if modal already exists in the document
        if (!document.querySelector('.modal')) new Modal();

        // modal does not exist, create new
        if (!document.querySelector('.modal-backdrop')) {

            self.modal = document.querySelector('.modal');
            self.modalCont = new bootstrap.Modal(self.modal, { backdrop: 'static', keyboard: false });
        }

        self.modal.querySelector('.modal-title').innerHTML = __html('Sign in');

        // should we reset attempt restrictions
        if (Math.floor(Date.now() / 1000) - self.resendLast > (5 * 60)) {

            self.resendTimes = 0;
            self.resendLast = Math.floor(Date.now() / 1000);

            localStorage.setItem('otp-resend-times', self.resendTimes);
            localStorage.setItem('otp-resend-last', Math.floor(Date.now() / 1000));
        }

        // prevent user from requesting OTP again
        if (self.resendTimes >= 3) {

            self.warningScreen(self, "attempts"); return;
        }

        self.modal.querySelector('.modal-footer').innerHTML = `
            <div class="btn-group" role="group">
                <button type="button" class="btn btn-outline-primary btn-modal btn-get-otp">${__html('Get OTP')}</button>
                <button type="button" class="btn btn-outline-dark" data-bs-dismiss="modal">${__html('Cancel')}</button>
            </div>
        `;

        let modalHTML = `
        <form class="form-cont needs-validation" novalidate>
        
            <div class="form-group row mb-3 mx-sm-3">

                <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" fill="#d1d8de" class="bi bi-shield-lock my-1" viewBox="0 0 16 16">
                    <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10z"/>
                </svg>

                <label for="otp-email" class="form-label col-lg-12 col-form-label text-center fw-bold fs-5">${__html('Email address')}</label>
                <div class="col-lg-12">
                    <input type="email" class="form-control form-control-lg" id="otp-email" autocomplete="off" placeholder="email@example.com" aria-describedby="emailHelp" value="${self.email}">
                    <div class="invalid-feedback otp-email-notice"></div>
                    <p class="form-text text-center">${__html('*You will receive a one-time password to your email address.')}</p>
                    <div class="text-center">
                        <div class="form-check form-switch d-inline-block form-text mt-4">
                            <input class="form-check-input" type="checkbox" id="trust-device" ${self.email.length > 0 ? 'checked' : ''}>
                            <label class="form-check-label" for="trust-device">${__html('Trust this device for 30 days.')}</label>
                        </div>
                    </div>
                </div>
            </div>

        </div>`;

        self.modal.querySelector('.modal-body').innerHTML = modalHTML;

        self.modalCont.show();

        self.modal.querySelector('#otp-email').focus();

        // get OTP button
        onClick('.btn-get-otp', e => {

            self.getOTP();
        });

        // on modal close listener
        self.modal.addEventListener('hidden.bs.modal', (event) => {

            if (self.otpSuccess) return;

            // self.screen();
        });
    }

    // sent OTP to user email address
    getOTP = () => {

        let self = this;

        // ui is blocked
        if (self.modal.querySelector('.btn-get-otp').dataset.loading) return false;

        // reset previous validation
        self.modal.querySelector('#otp-email').setCustomValidity(''); self.modal.querySelector('.otp-email-notice').innerHTML = '';

        // validate email
        let email = self.modal.querySelector('#otp-email').value;
        if (!validateEmail(email)) {

            self.modal.querySelector('#otp-email').setCustomValidity('wrong email format');
            self.modal.querySelector('.otp-email-notice').innerHTML = __html('wrong email format');
            self.modal.querySelector('form').classList.add('was-validated');

            return;
        }

        // email must be lower case
        email = email.toLowerCase();

        // cache email address for one day
        self.email = email;

        // validate form
        self.modal.querySelector('form').classList.add('was-validated');

        // show loading
        self.modal.querySelector('.btn-get-otp').dataset.loading = true;
        self.modal.querySelector('.btn-get-otp').innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>' + __html('Loading..');

        // cache valid email address in the browser if user trusts this device
        let trust = self.modal.querySelector('#trust-device').checked;
        if (trust) localStorage.setItem('otp-email', email);

        // cache unsuccessful attempts
        self.resendTimes += 1;
        self.resendLast = Math.floor(Date.now() / 1000);
        localStorage.setItem('otp-resend-times', self.resendTimes);
        localStorage.setItem('otp-resend-last', self.resendLast);

        // request OTP on server
        getOTP(email, (response) => {

            if (!response.nonce) return;

            self.viewVerify(response);
        });
    }

    // parse OTP request
    viewVerify = (response) => {

        const self = this;
        const nonce = response['nonce'];
        const email = self.email;

        self.modal.querySelector('.modal-footer').innerHTML = `
                <button type="button" class="btn btn-primary btn-modal btn-validate-otp">${__html('Verify')}</button>
                <button type="button" class="btn btn-secondary d-none" data-bs-dismiss="modal">${__html('Go back and resend (1/3)')}</button>
            `;

        let modalHTML = `
                <form class="form-cont needs-validation" novalidate>
                    <div class="form-group row mb-3 mx-sm-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" fill="#d1d8de" class="bi bi-shield-lock my-1" viewBox="0 0 16 16">
                            <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10z"/>
                        </svg>
        
                        <div class="container height-100 d-flex justify-content-center align-items-center">
                            <div class="position-relative">
                                <div class="p-2 text-center">
                                    <h6>${__html('Please enter a one-time password %1$ to verify your account.', '<br>')}</h6> 
                                <div>
                                <span class="form-text">${__html('A password has been sent to')}</span> 
                                <small>${email}</small>
                            </div>
                            <div id="otp" class="inputs d-flex flex-row justify-content-center mt-2"> 
                                <input class="m-1 m-sm-2 text-center form-control rounded" type="text" id="f1" autocomplete="off" maxlength="1" /> 
                                <input class="m-1 m-sm-2 text-center form-control rounded" type="text" id="f2" autocomplete="off" maxlength="1" /> 
                                <input class="m-1 m-sm-2 text-center form-control rounded" type="text" id="f3" autocomplete="off" maxlength="1" /> 
                                <input class="m-1 m-sm-2 text-center form-control rounded" type="text" id="f4" autocomplete="off" maxlength="1" /> 
                                <input class="m-1 m-sm-2 text-center form-control rounded" type="text" id="f5" autocomplete="off" maxlength="1" /> 
                                <input class="m-1 m-sm-2 text-center form-control rounded" type="text" id="f6" autocomplete="off" maxlength="1" /> 
                            </div> 
                            <div class="invalid-feedback otp-password-notice"></div>
                        </div> 
                        <div class="card-2 otp-note"> 
                            <div class="content d-flex justify-content-center align-items-center form-text"> 
                                <span>${__html('Didn\'t get the code?')}</span> 
                                <a href="#" class="ms-3 btn-resend-otp">${__html('Resend (%1$/%2$)', self.resendTimes, 3)}</a> 
                            </div> 
                        </div> 
                    </div>
                </form>
            `;

        self.modal.querySelector('.modal-body').innerHTML = modalHTML;

        // focus on first input field
        self.modal.querySelector('#f1').focus();

        // validate OTP click listener
        self.modal.querySelector('.btn-validate-otp').addEventListener('click', () => { self.validateOTP(email, nonce); });

        // resend OTP click listener
        self.modal.querySelector('.btn-resend-otp').addEventListener('click', () => { self.view(self); });

        // start validation countdown timer
        let display = document.querySelector('.btn-validate-otp');
        self.startTimer(60 * this.otpTimeout, display);

        // jump between otp input fields
        const inputs = document.querySelectorAll('#otp > *[id]');
        for (let i = 0; i < inputs.length; i++) {

            inputs[i].addEventListener('keydown', e => {

                // console.log(e.which);

                if (e.key === 'Backspace') {

                    inputs[i].value = ''; if (i !== 0) inputs[i - 1].focus();

                    // left key
                } else if (e.which == 37) {

                    if (i !== 0) inputs[i - 1].focus();

                    // right key
                } else if (e.which == 39) {

                    if (i !== inputs.length - 1) inputs[i + 1].focus();

                    // Enter
                } else if (e.key === "Enter") {

                    // console.log("field id: " + e.currentTarget.id);

                    if (e.currentTarget.id == 'f6') {

                        self.validateOTP(email, nonce);
                    }

                } else {

                    if (i === inputs.length - 1 && inputs[i].value !== '') {

                        return true;

                        // digits
                    } else if ((e.which > 47 && e.which < 58) || (e.which > 95 && e.which < 106)) {

                        // console.log("jump to: " + (i + 1));
                        inputs[i].value = e.key;
                        if (i !== inputs.length - 1) { inputs[i + 1].focus(); e.preventDefault(); }

                        // allow paste event
                    } else if (e.which == 86) {

                        // but prevent v pasting
                        if (!self.CTR) {

                            e.preventDefault();
                            return false;
                        }

                        // CTR (windows) or CMD (mac)
                    } else if (e.which == 17 || e.which == 91 || e.which == 93 || e.which == 224 || e.which == 224) {

                        // track paste beginning event
                        // console.log("CTR pressed start");
                        self.CTR = true;

                        // block non numbers
                    } else if (isNaN(String.fromCharCode(e.which))) {

                        // console.log("no a number ");
                        e.preventDefault();
                        return false;
                    }
                }
            });

            inputs[i].addEventListener('keyup', e => {

                if (e.which == 17 || e.which == 91 || e.which == 93) {

                    // track paste beginning event
                    self.CTR = false;
                }
            });

            inputs[i].addEventListener('paste', e => {

                e.preventDefault();

                let paste = (e.clipboardData || window.clipboardData).getData('text');
                let matches = paste.trim().match(/(\d+)/);

                // console.log("paste: " + paste);

                if (matches) {

                    // populate
                    [...matches[0]].forEach((c, i) => {

                        if (document.querySelector('.modal-body #otp > #f' + (i + 1))) document.querySelector('.modal-body #otp > #f' + (i + 1)).value = c;
                    });

                    self.validateOTP(email, nonce);
                }
                return false;
            });
        }
    }

    // valite OTP
    validateOTP = (email, nonce) => {

        let self = this;

        // UI is blocked
        if (self.modal.querySelector('.btn-validate-otp').dataset.loading) return;

        // restore  defaults
        self.modal.querySelector('.otp-password-notice').classList.remove('d-block');

        // make sure all fields are filled in
        let otp = [...document.querySelectorAll('#otp > *[id]')].map(el => { return el.value }).join('');
        if (otp.length != 6) {

            self.modal.querySelector('.otp-password-notice').innerHTML = __html('*wrong OTP provided');
            self.modal.querySelector('.otp-password-notice').classList.add('d-block');
            return;
        }

        // show loading button if validate is clicked
        self.modal.querySelector('.btn-validate-otp').dataset.loading = true;
        self.modal.querySelector('.btn-validate-otp').innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>' + __html('Loading..');

        // submit application
        validateOTP(email, otp, nonce, (response) => {

            // clear previous attempts 
            localStorage.setItem('otp-resend-times', 0);
            localStorage.setItem('otp-resend-last', 0);

            // store user token
            localStorage.setItem('token', response.token);

            // successfull request
            self.otpSuccess = true;

            // close modal
            self.modalCont.hide();

            // forces to reload session data
            // self.settings = "";

            // force rerender everything
            self.firstLoad = true;

            // clear interval
            clearInterval(self.interval);

            // reload the page to refresh user session
            location.reload();
        });
    }

    warningScreen = (self, type) => {

        let modalHTML = `
                <form class="form-cont needs-validation" novalidate>
                    <div class="form-group row mb-3 mx-sm-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" fill="#d1d8de" class="bi bi-exclamation-triangle my-1" viewBox="0 0 16 16">
                            <path d="M7.938 2.016A.13.13 0 0 1 8.002 2a.13.13 0 0 1 .063.016.146.146 0 0 1 .054.057l6.857 11.667c.036.06.035.124.002.183a.163.163 0 0 1-.054.06.116.116 0 0 1-.066.017H1.146a.115.115 0 0 1-.066-.017.163.163 0 0 1-.054-.06.176.176 0 0 1 .002-.183L7.884 2.073a.147.147 0 0 1 .054-.057zm1.044-.45a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566z"/>
                            <path d="M7.002 12a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 5.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995z"/>
                        </svg>
                        <div class="container height-100 d-flex justify-content-center align-items-center">
                            <div class="position-relative">
                                <div class="p-1 p-sm-2 text-center">
                                    <h6>${__html('Too many unsuccessful OTP requests. Please try again in 5 minutes.', '<br>')}</h6> 
                                <div>
                                <span class="form-text d-none">${__html('This is a temporary security measure.')}</span> 
                            </div>
                        </div> 
                        <div class="card-2 otp-note"> 
                            <div class="content d-flex justify-content-center align-items-center form-text"> 
                                <span>${__html('Need more help?')}</span> 
                                <a href="mailto:support@kenzap.com?subject=EATA%20Carnet%20Dashboard%20Support" class="ms-3 btn-resend-otp">${__html('Contact support')}</a> 
                            </div> 
                        </div> 
                    </div>
                </form>
            `;

        self.modal.querySelector('.modal-body').innerHTML = modalHTML;

        self.modal.querySelector('.modal-footer').classList.add('d-none');

        self.modalCont.show();
    }

    startTimer = (duration, display) => {

        let timer = duration, minutes, seconds, self = this;

        let loop = () => {

            minutes = parseInt(timer / 60, 10);
            seconds = parseInt(timer % 60, 10);

            minutes = minutes < 10 ? "0" + minutes : minutes;
            seconds = seconds < 10 ? "0" + seconds : seconds;

            // iu dismissed, clear timer
            if (!self.modal.querySelector('.btn-validate-otp')) { clearInterval(self.interval); return; }

            // show validation countdow timer
            if (!self.modal.querySelector('.btn-validate-otp').dataset.loading) display.textContent = __html('Verify (%1$)', minutes + ":" + seconds);

            // timer runs out, force request new otp
            if (--timer < 0) {

                if (self.interval) clearInterval(self.interval);

                self.view(self);
            }
        }

        loop(); self.interval = setInterval(() => { loop(); }, 1000);
    }
}