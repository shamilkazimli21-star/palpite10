import JoinFreeButton from "@/components/JoinFreeButton";

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background:
          "linear-gradient(135deg,#064D1F,#0B6E2E)",
        color: "white",
      }}
    >
      <section
        style={{
          maxWidth: 720,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 800,
            letterSpacing: 2,
            marginBottom: 20,
          }}
        >
          PALPITE10
        </div>

        <h1
          style={{
            fontSize:
              "clamp(42px,7vw,76px)",
            lineHeight: 0.95,
            margin: 0,
            marginBottom: 24,
          }}
        >
          Palpites de futebol
          <br />
          grátis no Telegram.
        </h1>

        <p
          style={{
            fontSize: 20,
            lineHeight: 1.5,
            opacity: 0.9,
            marginBottom: 32,
          }}
        >
          Entre no canal gratuito do
          PALPITE10 e acompanhe nossas
          previsões e análises.
        </p>

        <JoinFreeButton />

        <p
          style={{
            marginTop: 18,
            fontSize: 13,
            opacity: 0.7,
          }}
        >
          Você será direcionado ao
          Telegram.
        </p>
      </section>
    </main>
  );
}
