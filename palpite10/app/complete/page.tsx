import type { Metadata } from "next";
import { BUSINESS } from "@/src/config/business";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Pagamento em processamento — PALPITE10", robots: { index: false } };

export default function Complete() {
  const bot = process.env.TELEGRAM_BOT_USERNAME?.replace(/^@/, "");
  return (
    <main className="doc">
      <p className="eyebrow">{BUSINESS.vip.name}</p>
      <h1>Quase lá.</h1>
      <p>
        Assim que a Whop confirmar o pagamento, o acesso ao canal VIP chega <strong>na sua conversa com o nosso bot no Telegram</strong>. Normalmente leva menos de um minuto.
      </p>
      <p>Se o pagamento não foi concluído, nada foi cobrado: é só voltar ao bot e enviar /planos para tentar de novo.</p>
      {bot ? (
        <a className="cta cta--primary" href={`https://t.me/${bot}`}>
          Voltar para o Telegram
        </a>
      ) : null}
      <p className="micro">Não chegou em alguns minutos? Escreva para o bot que a equipe verifica.</p>
    </main>
  );
}
