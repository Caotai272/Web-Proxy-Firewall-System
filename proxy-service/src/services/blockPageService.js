function renderBlockPage({ title, message }) {
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${title}</title>
        <style>
          body {
            margin: 0;
            font-family: Arial, sans-serif;
            background: linear-gradient(135deg, #f4efe6 0%, #d8c3a5 100%);
            color: #2f241f;
            display: grid;
            place-items: center;
            min-height: 100vh;
          }
          .card {
            background: rgba(255, 255, 255, 0.9);
            border: 1px solid rgba(47, 36, 31, 0.12);
            border-radius: 16px;
            padding: 32px;
            width: min(520px, calc(100vw - 32px));
            box-shadow: 0 20px 50px rgba(47, 36, 31, 0.12);
          }
          h1 {
            margin-top: 0;
          }
        </style>
      </head>
      <body>
        <section class="card">
          <h1>${title}</h1>
          <p>${message}</p>
        </section>
      </body>
    </html>
  `;
}

module.exports = {
  renderBlockPage
};
