export function initRouter() {
    window.addEventListener("popstate", route);

    document.body.addEventListener("click", e => {
        const link = e.target.closest("[data-link]");
        if (link) {
            e.preventDefault();
            history.pushState(null, null, link.href);
            route();
        }
    });

    route();
}

async function route() {
    const path = window.location.pathname;
    const app = document.querySelector("#app");

    switch (path) {
        case "/about":
            app.innerHTML = "<h1>About Page</h1>";
            break;
        case "/settings-test/":
            // Dynamically import the settings page
            // const module = await import('/settings-test/index.js');
            // module.renderSettingsPage();
            // Optional: load CSS dynamically
            // loadStyle('/settings/style.css');
            break;
        default:
            app.innerHTML = "<h1>Home Page</h1>";
    }
}

function loadStyle(href) {
    if (!document.querySelector(`link[href="${href}"]`)) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = href;
        document.head.appendChild(link);
    }
}