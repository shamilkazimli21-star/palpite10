export default function CompletePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <section
        style={{
          maxWidth: 600,
          textAlign: "center",
        }}
      >
        <h1>
          Pagamento recebido
        </h1>

        <p>
          Seu pagamento está sendo
          processado. O acesso ao
          PALPITE10 VIP será atualizado
          automaticamente após a
          confirmação.
        </p>

        <p>
          Você também receberá a
          confirmação no Telegram.
        </p>
      </section>
    </main>
  );
}
