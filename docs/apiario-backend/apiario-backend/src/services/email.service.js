// =========================================================
//  services/email.service.js
//  UNICO punto che parla con Brevo. Usa fetch nativo (Node 18+)
//  verso l'API HTTP di Brevo: nessuna libreria intermedia.
//  Se un domani cambi provider, tocchi solo questo file.
// =========================================================

import { config } from '../config/env.js';

const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

// Invio generico di un'email transazionale via Brevo.
// Se la chiave API non è configurata, logga e NON blocca il flusso
// (utile in sviluppo): l'operazione chiamante prosegue.
async function inviaEmail({ destinatario, oggetto, html }) {
  if (!config.brevoApiKey) {
    console.warn(`[email] BREVO_API_KEY assente: email "${oggetto}" non inviata a ${destinatario}.`);
    console.warn('[email] In sviluppo puoi recuperare il link dai log/risposte; in produzione configura Brevo.');
    return { inviata: false };
  }

  const corpo = {
    sender: { email: config.emailFrom, name: config.emailFromName },
    to: [{ email: destinatario }],
    subject: oggetto,
    htmlContent: html,
  };

  const risposta = await fetch(BREVO_ENDPOINT, {
    method: 'POST',
    headers: {
      'api-key': config.brevoApiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(corpo),
  });

  if (!risposta.ok) {
    const dettaglio = await risposta.text().catch(() => '');
    console.error(`[email] Brevo ha risposto ${risposta.status}: ${dettaglio}`);
    throw new Error('Invio email fallito');
  }

  return { inviata: true };
}

// ---------- Email specifiche ----------

// Email di verifica indirizzo (dopo la registrazione).
export async function inviaEmailVerifica({ destinatario, nome, tokenGrezzo }) {
  const link = `${config.frontendUrl}/verifica-email.html?token=${tokenGrezzo}`;
  const saluto = nome ? `Ciao ${nome},` : 'Ciao,';
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:auto;color:#3A2E1A">
      <h2 style="color:#8B5E14">Il Mio Apiario 🐝</h2>
      <p>${saluto}</p>
      <p>Grazie per esserti registrato. Conferma il tuo indirizzo email cliccando qui sotto:</p>
      <p style="text-align:center;margin:28px 0">
        <a href="${link}"
           style="background:#E8A317;color:#fff;text-decoration:none;
                  padding:12px 24px;border-radius:10px;font-weight:600">
          Verifica la mia email
        </a>
      </p>
      <p style="font-size:13px;color:#7A6A4F">
        Se il pulsante non funziona, copia questo link nel browser:<br>
        <span style="word-break:break-all">${link}</span>
      </p>
      <p style="font-size:13px;color:#7A6A4F">Il link scade tra ${config.verifyTokenTtlHours} ore.</p>
    </div>
  `;
  return inviaEmail({ destinatario, oggetto: 'Verifica il tuo indirizzo email', html });
}

// Email di reset password.
export async function inviaEmailReset({ destinatario, nome, tokenGrezzo }) {
  const link = `${config.frontendUrl}/reimposta-password.html?token=${tokenGrezzo}`;
  const saluto = nome ? `Ciao ${nome},` : 'Ciao,';
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:auto;color:#3A2E1A">
      <h2 style="color:#8B5E14">Il Mio Apiario 🐝</h2>
      <p>${saluto}</p>
      <p>Hai richiesto di reimpostare la password. Clicca qui sotto per sceglierne una nuova:</p>
      <p style="text-align:center;margin:28px 0">
        <a href="${link}"
           style="background:#E8A317;color:#fff;text-decoration:none;
                  padding:12px 24px;border-radius:10px;font-weight:600">
          Reimposta la password
        </a>
      </p>
      <p style="font-size:13px;color:#7A6A4F">
        Se non hai richiesto tu il reset, ignora questa email: la tua password resta invariata.
      </p>
      <p style="font-size:13px;color:#7A6A4F">Il link scade tra ${config.resetTokenTtlHours} ora/e.</p>
    </div>
  `;
  return inviaEmail({ destinatario, oggetto: 'Reimposta la tua password', html });
}
