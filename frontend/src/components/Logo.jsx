// Marca de Nexo: una "N" cuyo trazo termina en un nodo (conexión).
export default function Logo({ tamano = 36, texto = true, claro = false, className = '' }) {
  return (
    <span className={`logo ${claro ? 'logo-claro' : ''} ${className}`}>
      <svg width={tamano} height={tamano} viewBox="0 0 64 64" role="img" aria-label="Nexo">
        <rect width="64" height="64" rx="14" fill="#0e6b5c" />
        <path d="M20 46V18l24 28V18" fill="none" stroke="#fff" strokeWidth="6"
              strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="44" cy="18" r="5" fill="#7fd1c0" />
      </svg>
      {texto && <span className="logo-texto">Nexo</span>}
    </span>
  );
}