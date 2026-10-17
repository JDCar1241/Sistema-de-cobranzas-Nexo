// Pantalla provisional hasta construir cada módulo
export default function Pronto({ titulo, hu }) {
  return (
    <div className="pagina">
      <h1>{titulo}</h1>
      <p className="suave">Esta pantalla se construye con la historia de usuario {hu}.</p>
    </div>
  );
}