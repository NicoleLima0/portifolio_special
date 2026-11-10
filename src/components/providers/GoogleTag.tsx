import Script from 'next/script';
import { site } from '@/lib/site';

/**
 * Tag do Google (contêiner do GTM). Via next/script em vez de <script> cru no <head>: com
 * `afterInteractive` ela baixa depois que a página hidrata, então não bloqueia a renderização
 * nem disputa a carga inicial com o hero. Mesmo código que o painel do GTM manda colar.
 */
export default function GoogleTag() {
  if (!site.gtmId) return null;
  return (
    <>
      <Script id="google-tag-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());`}
      </Script>
      <Script src={`https://www.googletagmanager.com/gtm.js?id=${site.gtmId}`} strategy="afterInteractive" />
    </>
  );
}
