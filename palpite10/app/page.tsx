import Link from "next/link";
import JoinFreeButton from "@/components/JoinFreeButton";
import { BUSINESS } from "@/src/config/business";

// Illustration only: which box the "pen" marks on each line of the slip. No real matches, no real picks.
const MARKS = [0, 2, 1, 0, 0, 2, 1, 0, 2, 0];

export default function Home() {
  return (
    <main className="page">
      <header className="top">
        <span className="brand">
          PALPITE<b>10</b>
        </span>
        <span className="age" title="Conteúdo para maiores de 18 anos">+18</span>
      </header>

      <section className="hero">
        <div className="hero__copy">
          <p className="eyebrow">Canal gratuito no Telegram</p>
          <h1>
            Um palpite de futebol por dia. <em>Baseado em dados.</em> De graça.
          </h1>
          <p className="lead">
            Todo dia a gente escolhe um jogo pelos números e manda o palpite, com o mercado indicado, direto no seu Telegram. Sem cadastro e sem cartão.
          </p>
          <JoinFreeButton />
          <p className="micro">Abre uma conversa rápida com o nosso assistente, que te passa o acesso ao canal.</p>
        </div>

        <figure className="slip" aria-label="Ilustração de um volante com dez linhas: a primeira é o palpite gratuito do dia, as outras são do VIP">
          <div className="slip__head">
            <span>
              PALPITE<b>10</b>
            </span>
            <span className="slip__serial">seleção do dia</span>
          </div>
          <div className="slip__cols" aria-hidden="true">
            <span />
            <span>1</span>
            <span>X</span>
            <span>2</span>
          </div>
          <ol className="slip__rows">
            {MARKS.map((mark, row) => (
              <li key={row} className={row === 0 ? "row row--free" : "row"} style={{ ["--i" as string]: row }}>
                <span className="row__n">{String(row + 1).padStart(2, "0")}</span>
                <span className="row__tag">{row === 0 ? "grátis" : "vip"}</span>
                {[0, 1, 2].map((box) => (
                  <span key={box} className={box === mark ? "box box--on" : "box"} />
                ))}
              </li>
            ))}
          </ol>
          <figcaption>Ilustração. Não representa palpites reais.</figcaption>
        </figure>
      </section>

      <section className="how" aria-labelledby="how-title">
        <h2 id="how-title">Como funciona</h2>
        <ol>
          <li>
            <b>Toque no botão</b>
            <span>O Telegram abre numa conversa com o assistente do {BUSINESS.brand}.</span>
          </li>
          <li>
            <b>Entre no canal gratuito</b>
            <span>Ele te manda o acesso. Você recebe {BUSINESS.freeChannel.postingFrequency}.</span>
          </li>
          <li>
            <b>Acompanhe sem compromisso</b>
            <span>Se um dia quiser a seleção completa, existe o VIP. Se não quiser, o gratuito continua igual.</span>
          </li>
        </ol>
      </section>

      <section className="honest" aria-labelledby="honest-title">
        <h2 id="honest-title">Papo reto</h2>
        <p>
          Palpite é análise, não garantia. A gente usa dados para escolher os jogos, mas futebol é futebol: ninguém acerta sempre, e nós também não. Nunca aposte dinheiro que faz falta.
        </p>
        <JoinFreeButton label="Quero o palpite grátis de hoje" variant="ghost" />
      </section>

      <footer className="foot">
        <p>
          <strong>+18.</strong> Conteúdo informativo sobre futebol para maiores de {BUSINESS.minimumAge} anos. O {BUSINESS.brand} não é casa de apostas, não recebe apostas e não garante resultados nem lucro. Jogue com
          responsabilidade. Se o jogo virou um problema, procure ajuda: CVV 188 · Jogadores Anônimos.
        </p>
        <p>
          <Link href="/privacidade">Privacidade</Link>
        </p>
      </footer>
    </main>
  );
}
