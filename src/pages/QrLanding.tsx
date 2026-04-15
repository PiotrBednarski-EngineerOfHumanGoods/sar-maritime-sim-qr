import { useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import './QrLanding.css'

/** Full URL to the simulation route (works with Vite `base`). */
function getSimUrl(): string {
  const path = import.meta.env.BASE_URL || '/'
  const normalized = path.endsWith('/') ? path : `${path}/`
  return new URL('sim', window.location.origin + normalized).href
}

export default function QrLanding() {
  const simUrl = useMemo(() => getSimUrl(), [])
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)

  useEffect(() => {
    const url = simUrl
    let cancelled = false
    QRCode.toDataURL(url, {
      width: 240,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#0f172a', light: '#ffffff' },
    })
      .then((dataUrl) => {
        if (!cancelled) setQrDataUrl(dataUrl)
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null)
      })
    return () => {
      cancelled = true
    }
  }, [simUrl])

  return (
    <div className="qr-landing">
      <header className="qr-landing__header">
        <h1 className="qr-landing__title">Symulacja SAR</h1>
        <p className="qr-landing__lead">
          Zeskanuj kod QR, aby otworzyć interaktywną symulację na telefonie w pełnym ekranie.
        </p>
      </header>

      <div className="qr-landing__qr-block">
        {qrDataUrl ? (
          <img className="qr-landing__qr" src={qrDataUrl} alt="Kod QR prowadzący do symulacji SAR" width={240} height={240} />
        ) : (
          <div className="qr-landing__qr qr-landing__qr--placeholder" aria-hidden />
        )}
        <p className="qr-landing__url" title={simUrl}>
          {simUrl}
        </p>
        <a className="qr-landing__cta" href={simUrl}>
          Otwórz symulację
        </a>
      </div>

      <section className="qr-landing__embed" aria-labelledby="qr-preview-heading">
        <h2 id="qr-preview-heading" className="qr-landing__embed-title">
          Podgląd (duży ekran)
        </h2>
        <p className="qr-landing__embed-hint">
          Na telefonie ukrywamy ten blok — użyj przycisku lub kodu QR powyżej.
        </p>
        <div className="qr-landing__frame-wrap">
          <iframe title="Symulacja SAR" className="qr-landing__iframe" src={simUrl} />
        </div>
      </section>
    </div>
  )
}
