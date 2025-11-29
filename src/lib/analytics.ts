// src/lib/analytics.ts

let eventQueue: { name: string; props?: Record<string, any> }[] = [];

export function initAnalytics() {
    // Evita reinicialização se já estiver rodando
    if (document.getElementById("plausible-script")) return;

    // Define Plausible Shim (Standard Snippet Logic)
    // @ts-ignore
    window.plausible = window.plausible || function () { (window.plausible.q = window.plausible.q || []).push(arguments) };
    // @ts-ignore
    window.plausible.init = window.plausible.init || function (i) { window.plausible.o = i || {} };

    // Initialize Plausible
    // @ts-ignore
    window.plausible.init();

    // Inject the new script
    const script = document.createElement("script");
    script.id = "plausible-script";
    script.src = "https://plausible.io/js/pa-91AC9E-tVaDSOrSsmAREV.js";
    script.async = true;

    script.onload = () => {
        console.log("[Analytics] Plausible script loaded.");
    };

    document.head.appendChild(script);

    // Flush local queue to Plausible Shim
    // The shim handles queuing for the real script, so we just need to push our early events to it.
    if (eventQueue.length > 0) {
        console.log("[Analytics] Flushing local queue to shim:", eventQueue.length);
        for (const evt of eventQueue) {
            // @ts-ignore
            window.plausible(evt.name, { props: evt.props });
        }
        eventQueue = [];
    }
}

export function track(event: string, props?: Record<string, any>) {
    // Em localhost, logamos para debug
    if (location.hostname === "localhost") {
        console.log(`[Analytics] Event: ${event}`, props);
        return; // Comente para testar envio local, descomente para produção
    }

    // Se o shim ainda não foi definido (initAnalytics não rodou), guarda na fila local
    // @ts-ignore
    if (!window.plausible) {
        eventQueue.push({ name: event, props });
        return;
    }

    // Se o shim já existe, chama direto (ele gerencia a fila interna ou envia se carregado)
    // @ts-ignore
    window.plausible(event, { props });
}
