import { __attr, __html, onClick } from "../helpers/global.js";
import { bus } from "../modules/bus.js";

export class Login {

    constructor() {

        this.init();
    }

    init = () => {

        this.view();

        this.listeners();
    }

    view = () => {

        document.querySelector('#app').innerHTML = `
            <div class="content hentry offset-top mt-12 mb-12 pt-md-4">
                <div class="container">
                    <div class="login-container text-center entry-content">
                        <h1 class="mb-4">${__html("Welcome Back!")}</h1>
                        <p class="mb-4">${__html("Sign in to continue to your account")}</p>
                        <div class="login-graphics mb-4">
                            <img src="/assets/img/undraw_under_construction.svg">
                        </div>
                        <form id="login-form" class="mb-4 ">
                            <div class="form-group mb-3 d-none">
                                <input type="email" class="form-control form-control-lg" id="email" placeholder="${__attr("Email")}" required>
                            </div>
                            <div class="form-group mb-3 d-none">
                                <input type="password" class="form-control form-control-lg" id="password" placeholder="${__attr("Password")}" required>
                            </div>
                            <div class="mx-5">
                                <button type="submit" class="btn btn-branded btn-signin-page btn-lg w-100">${__html("Sign in")}</button>
                            </div>
                        </form>
                        <p class="mt-4">${__html("Can't sign in?")} <a href="https://skarda.design/lv/kontakti">${__html("Contact Support")}</a></p>
                    </div>
                </div>
            </div>
            `;
    }

    listeners = () => {

        self = this;

        // Sign in button click
        onClick('.btn-signin-page', (e) => {

            e.preventDefault();

            bus.emit('auth:login');
        });
    }
}