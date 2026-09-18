import Link from "next/link";
import JoinFreeButton from "@/components/JoinFreeButton";
import { BUSINESS } from "@/src/config/business";
import { LANDING, type LandingKey } from "@/src/config/landing";
import { fill } from "@/src/config/texts";
import { loadSettings } from "@/src/lib/settings";

// Re-generated at most every 2 minutes so edits made in the admin panel show up here.
export const revalidate = 120;

// Illustration only: which box the "pen" marks on each line of the slip. No real matches, no real picks.
const MARKS = [0, 2, 1, 0, 0, 2, 1, 0, 2, 0];

export default async function Home() {
  await loadSettings();
  const L = (key: LandingKey) => fill(LANDING[key]);
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
          <p className="eyebrow">{L("eyebrow")}</p>
          <h1>
            {L("headline1")} <em>{L("headlineHighlight")}</em> {L("headline2")}
          </h1>
          <p className="lead">{L("lead")}</p>
          <JoinFreeButton label={L("cta")} />
          <p className="micro">{L("micro")}</p>
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
        <h2 id="how-title">{L("howTitle")}</h2>
        <ol>
          <li>
            <b>{L("step1Title")}</b>
            <span>{L("step1Text")}</span>
          </li>
          <li>
            <b>{L("step2Title")}</b>
            <span>{L("step2Text")}</span>
          </li>
          <li>
            <b>{L("step3Title")}</b>
            <span>{L("step3Text")}</span>
          </li>
        </ol>
      </section>

      <section className="honest" aria-labelledby="honest-title">
        <h2 id="honest-title">{L("honestTitle")}</h2>
        <p>{L("honestText")}</p>
        <JoinFreeButton label={L("cta2")} variant="ghost" />
      </section>

      <footer className="foot">
        <p>
          <strong>+18.</strong> {L("footer")}
        </p>
        <p>
          <Link href="/privacidade">Privacidade</Link>
        </p>
      </footer>
    </main>
  );
}
