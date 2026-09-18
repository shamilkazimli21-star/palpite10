import type { Metadata } from "next";
import Link from "next/link";
import { BUSINESS } from "@/src/config/business";

export const metadata: Metadata = { title: "Privacidade — PALPITE10" };

export default function Privacy() {
  return (
    <main className="doc">
      <p className="eyebrow">{BUSINESS.brand}</p>
      <h1>Privacidade</h1>
      <p>Explicação direta de quais dados usamos e para quê, conforme a LGPD.</p>

      <h2>O que coletamos</h2>
      <ul>
        <li>Nesta página: um identificador aleatório em cookie, os parâmetros do anúncio que trouxe você (UTM, fbclid), endereço IP e navegador.</li>
        <li>No Telegram: seu ID, primeiro nome e @usuário públicos, as mensagens que você troca com o nosso bot e se você entrou nos nossos canais.</li>
        <li>No pagamento: a Whop processa o pagamento. Nós recebemos apenas a confirmação, o plano, o valor e o e-mail usado na compra. Não temos acesso aos dados do seu cartão.</li>
      </ul>

      <h2>Para que usamos</h2>
      <ul>
        <li>Atender você no Telegram, liberar o acesso aos canais e dar suporte.</li>
        <li>Medir o resultado dos nossos anúncios (Meta Pixel e API de Conversões). Identificadores são enviados com hash.</li>
        <li>Melhorar o atendimento: conversas são analisadas, inclusive por sistemas de inteligência artificial, para entender dúvidas frequentes.</li>
      </ul>

      <h2>Quem processa os dados para nós</h2>
      <p>Vercel e Supabase (hospedagem e banco de dados), Telegram (mensagens), DeepSeek (assistente virtual), Whop (pagamentos) e Meta (medição de anúncios). Não vendemos seus dados.</p>

      <h2>Assistente virtual</h2>
      <p>O atendimento no Telegram é feito por um assistente virtual. Você pode pedir para falar com uma pessoa da equipe a qualquer momento.</p>

      <h2>Seus direitos</h2>
      <p>
        Você pode pedir acesso, correção ou exclusão dos seus dados escrevendo para o nosso bot no Telegram. Para parar de receber mensagens, envie <strong>PARAR</strong> no chat.
      </p>

      <h2>Idade</h2>
      <p>Conteúdo exclusivo para maiores de {BUSINESS.minimumAge} anos.</p>

      <p>
        <Link href="/">← Voltar</Link>
      </p>
    </main>
  );
}
