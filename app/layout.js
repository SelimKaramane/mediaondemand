import './globals.css'

export const metadata = {
  title: 'MediaOnDemand',
  description: 'Votre plateforme de vidéos et ebooks à la demande',
}

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
